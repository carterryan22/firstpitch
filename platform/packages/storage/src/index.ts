export * from "./types";
export * from "./repos";
export * from "./stores";

import { InMemoryStore, JsonFileStore } from "./stores";
import { makeRepos, type Repos } from "./repos";

let singleton: Repos | null = null;

/** Singleton resolved from env. `PLATFORM_DATA_DIR=...` enables JsonFileStore. */
export function getRepos(): Repos {
  if (singleton) return singleton;
  const dir = process.env.PLATFORM_DATA_DIR;
  const store = dir
    ? new JsonFileStore(`${dir.replace(/[\\/]+$/, "")}/platform.json`)
    : new InMemoryStore();
  singleton = makeRepos(store);
  return singleton;
}

/** Test helper — reset the singleton so the next getRepos() rebuilds it. */
export function __resetReposForTests(): void {
  singleton = null;
}
