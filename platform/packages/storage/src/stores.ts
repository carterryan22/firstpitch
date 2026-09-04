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
      await this.writeUnlocked(db);
    } finally {
      releaseFileLock();
    }
  }
  private async writeUnlocked(db: DbShape): Promise<void> {
    const tmp = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    for (let attempt = 0; ; attempt += 1) {
      try {
        fs.renameSync(tmp, this.filePath);
        return;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        // Windows indexers/antivirus can briefly hold the destination open.
        // Keep the old DB and the mutation lock intact while retrying the rename.
        if (attempt >= 9 || !["EPERM", "EACCES", "EBUSY"].includes(code ?? "")) throw error;
        await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
      }
    }
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
      await this.writeUnlocked(db);
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
    const payload = await res.json();
    if (payload && typeof payload === "object" && "error" in payload) {
      throw new Error("KV command failed; refusing to continue");
    }
    return payload;
  }

  private async command(args: Array<string | number>): Promise<unknown> {
    return this.fetch("", {
      method: "POST",
      body: JSON.stringify(args),
    });
  }

  private parse(raw: string | null): DbShape {
    if (raw === null) return structuredClone(EMPTY_DB);
    try {
      let value = raw;
      for (let depth = 0; depth < 8; depth += 1) {
        const json = value.startsWith("gz:")
          ? gunzipSync(Buffer.from(value.slice(3), "base64")).toString("utf8")
          : value;
        const parsed: unknown = JSON.parse(json);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Expected a database object");
        }
        // Older writers accidentally stored the POST body's { value } envelope.
        // Unwrap it without changing the stored bytes during reads. Mixed records
        // need explicit recovery: silently choosing a layer could lose history.
        if ("value" in parsed) {
          if (Object.keys(parsed).length !== 1 || typeof parsed.value !== "string") {
            throw new Error("Mixed legacy KV data requires recovery before writing");
          }
          value = parsed.value;
          continue;
        }
        const collections = Object.keys(EMPTY_DB);
        if (!collections.some((key) => key in parsed)) throw new Error("Missing database collections");
        for (const key of collections) {
          if (key in parsed && !Array.isArray((parsed as Record<string, unknown>)[key])) {
            throw new Error(`Invalid database collection: ${key}`);
          }
        }
        return { ...structuredClone(EMPTY_DB), ...parsed } as DbShape;
      }
      throw new Error("Too many legacy KV envelopes");
    } catch (error) {
      throw new Error("KV database contains invalid JSON or schema; refusing to continue", {
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
    await this.update(() => ({ value: db, result: undefined }));
  }

  async mutate<T>(fn: (db: DbShape) => T): Promise<T> {
    return this.update((db) => ({ value: db, result: fn(db) }));
  }

  private async update<T>(fn: (db: DbShape) => { value: DbShape; result: T }): Promise<T> {
    const lockKey = `${this.key}:mutation-lock`;
    const releaseLock = [
      "if redis.call('GET', KEYS[1]) == ARGV[1] then",
      "  return redis.call('DEL', KEYS[1])",
      "end",
      "return 0",
    ].join("\n");
    const commit = [
      "if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end",
      "redis.call('SET', KEYS[2], ARGV[2])",
      "redis.call('DEL', KEYS[1])",
      "return 1",
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

      let committed = false;
      try {
        const db = await this.read();
        const next = fn(db);
        // Check ownership and commit in one Redis operation. A delayed writer
        // whose lease expired must re-read and retry, never overwrite a newer DB.
        // Command-array arguments also store the exact value, without a wrapper.
        const response = (await this.command([
          "EVAL", commit, 2, lockKey, this.key, token, this.encode(next.value),
        ])) as { result: number };
        if (response.result === 1) {
          committed = true;
          return next.result;
        }
        if (response.result !== 0) throw new Error("KV returned an invalid commit result");
      } finally {
        if (!committed) {
          await this.command(["EVAL", releaseLock, 1, lockKey, token]).catch(() => undefined);
        }
      }
    }

    throw new Error("KV mutation lock remained busy; retry the request");
  }
}
