// @platform/corpus-watch — approve CLI. Marks pending queue candidates as
// `approved` so they get promoted on the next `npm run promote` when the
// approval gate is on (CORPUS_PROMOTE_REQUIRE_APPROVAL=1).
//
// Usage:
//   npm run approve -- --all              approve every pending item
//   npm run approve -- antonelli swing    approve items matching any term
//                                         (case-insensitive, creator or title)
//   npm run approve -- --list             just list pending items + exit

import {
  QUEUE_JSON_PATH,
  QUEUE_MD_PATH,
  type Candidate,
  loadJson,
  writeJson,
  renderDigest,
} from "./shared.ts";
import { writeFile } from "node:fs/promises";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const queue = await loadJson<Candidate[]>(QUEUE_JSON_PATH, []);
  const pending = queue.filter(
    (c) => c.status === "pending_review" && !c.needs_manual_check,
  );

  if (args.includes("--list") || args.length === 0) {
    if (!pending.length) {
      console.log("No pending candidates.");
      return;
    }
    console.log(`${pending.length} pending candidate(s):`);
    for (const c of pending)
      console.log(`  • ${c.source_name}: ${c.content_title}\n    ${c.id}`);
    console.log(
      "\nApprove with: npm run approve -- --all   or   npm run approve -- <term> ...",
    );
    return;
  }

  const all = args.includes("--all");
  const terms = args
    .filter((a) => !a.startsWith("--"))
    .map((t) => t.toLowerCase());

  let approved = 0;
  for (const c of queue) {
    if (c.status !== "pending_review" || c.needs_manual_check) continue;
    const hay = `${c.source_name} ${c.content_title} ${c.id}`.toLowerCase();
    const match = all || terms.some((t) => hay.includes(t));
    if (match) {
      c.status = "approved";
      approved += 1;
      console.log(`  ✓ approved: ${c.source_name} — ${c.content_title}`);
    }
  }

  if (!approved) {
    console.log("Nothing matched. (Try `npm run approve -- --list`.)");
    return;
  }

  await writeJson(QUEUE_JSON_PATH, queue);
  await writeFile(
    QUEUE_MD_PATH,
    renderDigest(queue, new Date().toISOString()),
    "utf8",
  );
  console.log(`\nApproved ${approved} item(s). Run \`npm run promote\` to add them.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
