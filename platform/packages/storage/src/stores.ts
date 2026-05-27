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
  constructor(seed?: Partial<DbShape>) {
    this.db = { ...EMPTY_DB, ...seed };
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
    this.cache = { ...EMPTY_DB, ...parsed };
    return this.cache;
  }
  async write(db: DbShape): Promise<void> {
    this.cache = db;
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, this.filePath);
  }
}

/**
 * KvJsonStore — stores the entire DB blob at a single Vercel KV key.
 *
 * Trade-offs:
 *   - Simple: one round trip per read, one per write
 *   - No transactional isolation; two concurrent writers can clobber each other.
 *     Acceptable for an MVP coach tool. Migrate to per-collection keys or a
 *     real relational store when concurrency matters.
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

  async read(): Promise<DbShape> {
    const res = (await this.fetch(`/get/${encodeURIComponent(this.key)}`)) as {
      result: string | null;
    };
    if (!res.result) return { ...EMPTY_DB };
    try {
      const parsed = JSON.parse(res.result) as Partial<DbShape>;
      return { ...EMPTY_DB, ...parsed };
    } catch {
      return { ...EMPTY_DB };
    }
  }

  async write(db: DbShape): Promise<void> {
    await this.fetch(`/set/${encodeURIComponent(this.key)}`, {
      method: "POST",
      body: JSON.stringify({ value: JSON.stringify(db) }),
    });
  }
}
