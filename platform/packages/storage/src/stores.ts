// Storage backends. All implement async Store from repos.ts.
// - InMemoryStore: process-local. Tests + dev.
// - JsonFileStore: single JSON file with atomic-rename writes. Local persistence.
// - KvJsonStore: Vercel KV (Upstash REST). Production on Vercel.

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type { DbShape } from "./types";
import { createEmptyDb } from "./types";
import type { Store } from "./repos";

export class InMemoryStore implements Store {
  private db: DbShape;
  constructor(seed?: Partial<DbShape>) {
    this.db = { ...createEmptyDb(), ...seed };
  }
  async read(): Promise<DbShape> {
    return this.db;
  }
  async write(db: DbShape): Promise<void> {
    this.db = db;
  }
}

export class JsonFileStore implements Store {
  private cache: DbShape | null = null;
  constructor(public readonly filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(createEmptyDb(), null, 2));
    }
  }
  async read(): Promise<DbShape> {
    if (this.cache) return this.cache;
    const raw = fs.readFileSync(this.filePath, "utf-8");
    let parsed: Partial<DbShape> = {};
    try {
      parsed = JSON.parse(raw) as Partial<DbShape>;
    } catch (err) {
      // Corrupt DB file: keep a backup and start fresh rather than crash on boot.
      const backup = `${this.filePath}.corrupt-${Date.now()}`;
      try {
        fs.renameSync(this.filePath, backup);
      } catch {
        // best-effort
      }
      console.error(
        `[JsonFileStore] Failed to parse ${this.filePath}; quarantined to ${backup}`,
        err,
      );
    }
    this.cache = { ...createEmptyDb(), ...parsed };
    return this.cache;
  }
  async write(db: DbShape): Promise<void> {
    this.cache = db;
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, this.filePath);
  }
}

const LOCK_TTL_MS = 30_000;
const LOCK_WAIT_MS = 10_000;
const LOCK_RETRY_MS = 50;
const RELEASE_LOCK_SCRIPT =
  'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';
const COMMIT_AND_RELEASE_SCRIPT =
  'if redis.call("get", KEYS[1]) == ARGV[1] then redis.call("set", KEYS[2], ARGV[2]); redis.call("del", KEYS[1]); return 1 else return 0 end';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Stores the database as one KV value and serializes mutations with a lease. */
export class KvJsonStore implements Store {
  private readonly url: string;
  private readonly token: string;
  private readonly key: string;
  private readonly lockKey: string;
  constructor(opts: { url: string; token: string; key?: string }) {
    this.url = opts.url.replace(/\/+$/, "");
    this.token = opts.token;
    this.key = opts.key ?? "platform:db";
    this.lockKey = `${this.key}:mutation-lock`;
  }

  private async command<T>(args: Array<string | number>): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as { result?: T; error?: string };
    if (!res.ok) {
      throw new Error(`KV ${args[0]} failed with HTTP ${res.status}`);
    }
    if (json.error) throw new Error(`KV ${args[0]} failed: ${json.error}`);
    return json.result as T;
  }

  async read(): Promise<DbShape> {
    const raw = await this.command<string | null>(["GET", this.key]);
    if (!raw) return createEmptyDb();
    try {
      let parsed = JSON.parse(raw) as Partial<DbShape> & { value?: unknown };
      // Older builds posted {value:"<json>"} as the raw Redis value. Decode it
      // so an existing deployment can migrate on its next successful write.
      if (typeof parsed.value === "string" && !Array.isArray(parsed.users)) {
        parsed = JSON.parse(parsed.value) as Partial<DbShape>;
      }
      return { ...createEmptyDb(), ...parsed };
    } catch (error) {
      throw new Error("KV database value is not valid JSON", { cause: error });
    }
  }

  async write(db: DbShape): Promise<void> {
    await this.command<string>(["SET", this.key, JSON.stringify(db)]);
  }

  async mutate<T>(fn: (db: DbShape) => T): Promise<T> {
    const lockToken = await this.acquireLock();
    let committed = false;
    try {
      const db = await this.read();
      const result = fn(db);
      const didCommit = await this.command<number>([
        "EVAL",
        COMMIT_AND_RELEASE_SCRIPT,
        2,
        this.lockKey,
        this.key,
        lockToken,
        JSON.stringify(db),
      ]);
      if (didCommit !== 1) throw new Error("KV mutation lock expired before commit");
      committed = true;
      return result;
    } finally {
      if (!committed) {
        await this.command<number>([
          "EVAL",
          RELEASE_LOCK_SCRIPT,
          1,
          this.lockKey,
          lockToken,
        ]).catch(() => undefined);
      }
    }
  }

  private async acquireLock(): Promise<string> {
    const token = crypto.randomUUID();
    const deadline = Date.now() + LOCK_WAIT_MS;
    while (Date.now() < deadline) {
      const acquired = await this.command<string | null>([
        "SET",
        this.lockKey,
        token,
        "NX",
        "PX",
        LOCK_TTL_MS,
      ]);
      if (acquired === "OK") return token;
      await delay(LOCK_RETRY_MS);
    }
    throw new Error("Timed out waiting for KV mutation lock");
  }
}
