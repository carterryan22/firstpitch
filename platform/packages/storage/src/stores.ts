// In-memory + JSON-file stores. Both implement Store from repos.ts.

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
  read(): DbShape {
    return this.db;
  }
  write(db: DbShape): void {
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
  read(): DbShape {
    if (this.cache) return this.cache;
    const raw = fs.readFileSync(this.filePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    this.cache = { ...EMPTY_DB, ...parsed };
    return this.cache;
  }
  write(db: DbShape): void {
    this.cache = db;
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, this.filePath);
  }
}
