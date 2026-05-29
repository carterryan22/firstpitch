import { anonymousScenario } from "./anonymous.ts";
import { brokenLinksScenario } from "./broken-links.ts";
import { coachFlowScenario } from "./coach-flow.ts";
import { parentFlowScenario } from "./parent-flow.ts";
import { apiSmokeScenario } from "./api-smoke.ts";
import { safetyScenario } from "./safety-gates.ts";
import type { Scenario } from "../types.ts";

export const scenarios: Scenario[] = [
  anonymousScenario,
  brokenLinksScenario,
  apiSmokeScenario,
  coachFlowScenario,
  parentFlowScenario,
  safetyScenario,
];
