#!/usr/bin/env node
// CLI runner for the eval harness. Usage: `node packages/eval/src/cli.ts` (via tsx)
// or `npm run eval` from the workspace root.

import { runAll } from "./index";

const run = runAll();
const pct = ((run.passed / run.total) * 100).toFixed(1);
const line = `Eval: ${run.passed}/${run.total} passed (${pct}%)  failed=${run.failed}`;

if (run.failed === 0) {
  console.log("\x1b[32m%s\x1b[0m", line);
  process.exit(0);
}
console.error("\x1b[31m%s\x1b[0m", line);
for (const f of run.failures) {
  console.error(`  - [${f.id}] ${f.description}${f.detail ? ` :: ${f.detail}` : ""}`);
}
process.exit(1);
