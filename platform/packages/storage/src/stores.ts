// Storage backends. All implement async Store from repos.ts.
// - InMemoryStore: process-local. Tests + dev.
// - JsonFileStore: single JSON file with atomic-rename writes. Local persistence.
// - KvJsonStore: Vercel KV (Upstash REST). Production on Vercel.

import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
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
  private mutationTail: Promise<void> = Promise.resolve();
  constructor(public readonly filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    try {
      const fd = fs.openSync(filePath, "wx");
      fs.writeFileSync(fd, JSON.stringify(EMPTY_DB, null, 2));
      fs.closeSync(fd);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  async read(): Promise<DbShape> {
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
    return { ...structuredClone(EMPTY_DB), ...parsed };
  }
  async write(db: DbShape): Promise<void> {
    const releaseFileLock = await this.acquireFileLock();
    try {
      this.writeUnlocked(db);
    } finally {
      releaseFileLock();
    }
  }
  private writeUnlocked(db: DbShape): void {
    const tmp = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, this.filePath);
  }
  private async acquireFileLock(): Promise<() => void> {
    const lockPath = `${this.filePath}.lock`;
    for (let attempt = 0; attempt < 200; attempt += 1) {
      try {
        const fd = fs.openSync(lockPath, "wx");
        fs.writeFileSync(fd, `${process.pid}\n${Date.now()}\n`);
        return () => {
          try { fs.closeSync(fd); } catch { /* already closed */ }
          try { fs.unlinkSync(lockPath); } catch { /* best-effort cleanup */ }
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        try {
          if (Date.now() - fs.statSync(lockPath).mtimeMs > 60_000) {
            fs.unlinkSync(lockPath);
            continue;
          }
        } catch {
          continue;
        }
        await new Promise((resolve) => setTimeout(resolve, Math.min(100, 10 + attempt)));
      }
    }
    throw new Error(`Timed out waiting for JSON store lock: ${this.filePath}`);
  }
  async mutate<T>(fn: (db: DbShape) => T): Promise<T> {
    const previous = this.mutationTail;
    let release!: () => void;
    this.mutationTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    let releaseFileLock: (() => void) | undefined;
    try {
      releaseFileLock = await this.acquireFileLock();
      const db = await this.read();
      const result = fn(db);
      this.writeUnlocked(db);
      return result;
    } finally {
      releaseFileLock?.();
      release();
    }
  }
}

/**
 * KvJsonStore — stores the entire DB blob at a single Vercel KV key.
 *
 * Values are gzip-compressed so the MVP's single document stays below provider
 * request limits. Mutations use a short-lived Redis lock, preventing silent
 * lost updates without sending the old and new database in the same request.
 * Legacy plain-JSON values remain readable and migrate on their next write.
 * Per-entity relational storage is still the long-term scaling path.
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
      const json = raw.startsWith("gz:")
        ? gunzipSync(Buffer.from(raw.slice(3), "base64")).toString("utf8")
        : raw;
      const parsed = JSON.parse(json) as Partial<DbShape>;
      return { ...structuredClone(EMPTY_DB), ...parsed };
    } catch (error) {
      throw new Error("KV database contains invalid JSON; refusing to continue", {
        cause: error,
      });
    }
  }

  private encode(db: DbShape): string {
    return `gz:${gzipSync(JSON.stringify(db)).toString("base64")}`;
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
      body: JSON.stringify({ value: this.encode(db) }),
    });
  }

  async mutate<T>(fn: (db: DbShape) => T): Promise<T> {
    const lockKey = `${this.key}:mutation-lock`;
    const releaseLock = [
      "if redis.call('GET', KEYS[1]) == ARGV[1] then",
      "  return redis.call('DEL', KEYS[1])",
      "end",
      "return 0",
    ].join("\n");

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const token = randomUUID();
      const acquired = (await this.command([
        "SET", lockKey, token, "NX", "PX", 30_000,
      ])) as { result: "OK" | null };
      if (acquired.result !== "OK") {
        await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
        continue;
      }

      try {
        const db = await this.read();
        const result = fn(db);
        await this.write(db);
        return result;
      } finally {
        await this.command(["EVAL", releaseLock, 1, lockKey, token]).catch(() => undefined);
      }
    }

    throw new Error("KV mutation lock remained busy; retry the request");
  }
}
