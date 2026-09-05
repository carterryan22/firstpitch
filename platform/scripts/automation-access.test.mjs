import { test } from "node:test";
import assert from "node:assert/strict";
import { automationHeaders } from "./automation-access.mjs";
const env = { VERCEL_AUTOMATION_BYPASS_SECRET: "test-only", QA_AUTHORIZED_PREVIEW_ORIGIN: "https://preview.example.test" };
test("attaches only to the explicitly authorized preview origin", () => {
  assert.deepEqual(automationHeaders("https://preview.example.test/api/teams", env), { "x-vercel-protection-bypass": "test-only" });
  for (const url of ["https://production.example.test", "https://external.example", "http://preview.example.test", "https://preview.example.test.evil.example", "https://user:pass@preview.example.test"]) {
    assert.deepEqual(automationHeaders(url, env), {});
  }
});
test("does nothing for ordinary local testing", () => assert.deepEqual(automationHeaders("http://localhost:3001", {}), {}));
test("requires an explicit valid HTTPS origin before using a secret", () => {
  for (const origin of [undefined, "http://preview.example.test", "https://user:pass@preview.example.test", "https://preview.example.test/path", "https://preview.example.test/?secret=x"]) {
    assert.throws(() => automationHeaders("https://preview.example.test", { ...env, QA_AUTHORIZED_PREVIEW_ORIGIN: origin }));
  }
});
