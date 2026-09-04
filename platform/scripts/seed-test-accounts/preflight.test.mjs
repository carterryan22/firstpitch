import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSeedHealth } from "./preflight.mjs";

const healthy = { status: "ok", store: { backend: "kv", reachable: true }, config: { auth: true } };
const emailMissing = { ...healthy, status: "degraded", missing: ["email"] };

test("accepts a healthy durable target", () => assert.doesNotThrow(() => validateSeedHealth(200, healthy)));
test("missing email requires explicit demo opt-in", () => {
  assert.throws(() => validateSeedHealth(503, emailMissing));
  assert.doesNotThrow(() => validateSeedHealth(503, emailMissing, true));
});
test("demo opt-in cannot hide broken storage or authentication", () => {
  for (const invalid of [
    { ...emailMissing, store: { backend: "kv", reachable: false } },
    { ...emailMissing, store: { backend: "memory", reachable: true } },
    { ...emailMissing, config: { auth: false } },
    { ...emailMissing, missing: ["email", "persistence"] },
  ]) assert.throws(() => validateSeedHealth(503, invalid, true));
});
test("does not treat protection pages or malformed bodies as readiness", () => {
  for (const invalid of [null, {}, "<html>Sign in to Vercel</html>"]) {
    assert.throws(() => validateSeedHealth(200, invalid, true));
  }
  assert.throws(() => validateSeedHealth(401, healthy, true));
});
