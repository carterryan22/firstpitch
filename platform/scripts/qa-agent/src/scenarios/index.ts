import { a11yScenario } from "./a11y-scan.ts";
import { anonymousScenario } from "./anonymous.ts";
import { authzIsolationScenario } from "./authz-isolation.ts";
import { brokenLinksScenario } from "./broken-links.ts";
import { coachFlowScenario } from "./coach-flow.ts";
import { e25SurfacesScenario } from "./e25-surfaces.ts";
import { parentFlowScenario } from "./parent-flow.ts";
import { apiSmokeScenario } from "./api-smoke.ts";
import { safetyScenario } from "./safety-gates.ts";
import type { Scenario } from "../types.ts";

export const scenarios: Scenario[] = [
  anonymousScenario,
  brokenLinksScenario,
  apiSmokeScenario,
  coachFlowScenario,
  e25SurfacesScenario,
  parentFlowScenario,
  safetyScenario,
  authzIsolationScenario,
  a11yScenario,
];
