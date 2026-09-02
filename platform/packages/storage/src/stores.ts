// Storage backends. All implement async Store from repos.ts.
// - InMemoryStore: process-local. Tests + dev.
// - JsonFileStore: single JSON file with atomic-rename writes. Local persistence.
// - KvJsonStore: Vercel KV (Upstash REST). Production on Vercel.

import * as fs from "node:fs";
import * as path from "node:path";
import type { DbShape } from "./types";
import { EMPTY_DB } from "./types";
import type { Store } from "./repos";

export class InMemoryStore implements Store {
  private db: DbShape;
  private mutationTail: Promise<void> = Promise.resolve();
  constructor(seed?: Partial<DbShape>) {
    this.db = {
      ...structuredClone(EMPTY_DB),
      ...(seed ? structuredClone(seed) : {}),
    };
  }
  async read(): Promise<DbShape> {
    return this.db;
  }
  async write(db: DbShape): Promise<void> {
    this.db = db;
  }
  async mutate<T>(fn: (db: DbShape) => T): Promise<T> {
    const previous = this.mutationTail;
    let release!: () => void;
    this.mutationTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return fn(this.db);
    } finally {
      release();
    }
  }
}

export class JsonFileStore implements Store {
  private cache: DbShape | null = null;
  private mutationTail: Promise<void> = Promise.resolve();
  constructor(public readonly filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(EMPTY_DB, null, 2));
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
    this.cache = { ...structuredClone(EMPTY_DB), ...parsed };
    return this.cache;
  }
  async write(db: DbShape): Promise<void> {
    this.cache = db;
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, this.filePath);
  }
  async mutate<T>(fn: (db: DbShape) => T): Promise<T> {
    const previous = this.mutationTail;
    let release!: () => void;
    this.mutationTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      const db = await this.read();
      const result = fn(db);
      await this.write(db);
      return result;
    } finally {
      release();
    }
  }
}

/**
 * KvJsonStore — stores the entire DB blob at a single Vercel KV key.
 *
 * Mutations use a Redis-side Lua compare-and-set. A conflicting writer causes
 * the mutation to reload and retry, preventing silent lost updates while this
 * MVP remains on a single JSON blob. Per-entity relational storage is still the
 * long-term scaling path.
 */
export class KvJsonStore implements Store {
  private readonly url: string;
  private readonly token: string;
  private readonly key: string;
  constructor(opts: { url: string; token: string; key?: string }) {
    this.url = opts.url.replace(/\/+$/, "");
    this.token = opts.token;
    this.key = opts.key ?? "platform:db";
  }

  private async fetch(path: string, init?: RequestInit): Promise<unknown> {
    const res = await fetch(`${this.url}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`KV ${init?.method ?? "GET"} ${path} → ${res.status}`);
    }
    return res.json();
  }

  private async command(args: Array<string | number>): Promise<unknown> {
    return this.fetch("", {
      method: "POST",
      body: JSON.stringify(args),
    });
  }

  private parse(raw: string | null): DbShape {
    if (!raw) return structuredClone(EMPTY_DB);
    try {
      const parsed = JSON.parse(raw) as Partial<DbShape>;
      return { ...structuredClone(EMPTY_DB), ...parsed };
    } catch (error) {
      throw new Error("KV database contains invalid JSON; refusing to continue", {
        cause: error,
      });
    }
  }

  async read(): Promise<DbShape> {
    const res = (await this.fetch(`/get/${encodeURIComponent(this.key)}`)) as {
      result: string | null;
    };
    return this.parse(res.result);
  }

  async write(db: DbShape): Promise<void> {
    await this.fetch(`/set/${encodeURIComponent(this.key)}`, {
      method: "POST",
      body: JSON.stringify({ value: JSON.stringify(db) }),
    });
  }

  async mutate<T>(fn: (db: DbShape) => T): Promise<T> {
    const compareAndSet = [
      "local current = redis.call('GET', KEYS[1])",
      "if current == false then current = '' end",
      "if current ~= ARGV[1] then return 0 end",
      "redis.call('SET', KEYS[1], ARGV[2])",
      "return 1",
    ].join("\n");

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const current = (await this.fetch(`/get/${encodeURIComponent(this.key)}`)) as {
        result: string | null;
      };
      const db = this.parse(current.result);
      const result = fn(db);
      const next = JSON.stringify(db);
      const response = (await this.command([
        "EVAL",
        compareAndSet,
        1,
        this.key,
        current.result ?? "",
        next,
      ])) as { result: number };
      if (response.result === 1) return result;
    }

    throw new Error("KV mutation conflicted repeatedly; retry the request");
  }
}
