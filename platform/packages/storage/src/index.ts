export * from "./types";
export * from "./repos";
export * from "./stores";

import { InMemoryStore, JsonFileStore, KvJsonStore } from "./stores";
import { makeRepos, type Repos } from "./repos";

let singleton: Repos | null = null;

/**
 * Singleton resolved from env. Precedence:
 *  1. KV_REST_API_URL + KV_REST_API_TOKEN → Vercel KV
 *  2. PLATFORM_DATA_DIR → JsonFileStore at <dir>/platform.json
 *  3. default → InMemoryStore (process-local; data lost on restart)
 */
export function getRepos(): Repos {
  if (singleton) return singleton;
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const dir = process.env.PLATFORM_DATA_DIR;

  let store;
  if (kvUrl && kvToken) {
    store = new KvJsonStore({ url: kvUrl, token: kvToken });
  } else if (dir) {
    store = new JsonFileStore(`${dir.replace(/[\\/]+$/, "")}/platform.json`);
  } else {
    store = new InMemoryStore();
  }
  singleton = makeRepos(store);
  return singleton;
}

/** Test helper — reset the singleton so the next getRepos() rebuilds it. */
export function __resetReposForTests(): void {
  singleton = null;
}
