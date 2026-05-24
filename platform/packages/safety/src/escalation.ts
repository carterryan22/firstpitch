// E5.7 — injury / fatigue history + escalation.
// Pure function: given a report, decide who must be notified and how urgently.

export type Severity = "mild" | "moderate" | "severe";

export interface InjuryReport {
  playerId: string;
  reportedAt: Date;
  symptom: string;
  severity: Severity;
  reportedBy: "player" | "coach" | "parent";
  bodyArea?: string;
}

export type EscalationTarget = "parent" | "coach" | "clinician" | "facility_admin" | "platform_admin";

export interface EscalationDecision {
  escalateTo: EscalationTarget[];
  withinMinutes: number;
  message: string;
  blocksReturnToPlay: boolean;
}

const ARM_KEYWORDS = ["elbow", "shoulder", "forearm", "ucl", "biceps", "rotator"];
const HEAD_KEYWORDS = ["head", "concussion", "dizzy", "vision", "headache"];

export function decideEscalation(report: InjuryReport): EscalationDecision {
  const sym = report.symptom.toLowerCase();
  const area = (report.bodyArea ?? "").toLowerCase();
  const isArm = ARM_KEYWORDS.some((k) => sym.includes(k) || area.includes(k));
  const isHead = HEAD_KEYWORDS.some((k) => sym.includes(k) || area.includes(k));

  if (isHead) {
    return {
      escalateTo: ["parent", "coach", "clinician"],
      withinMinutes: 1,
      message: "Possible head injury. Stop play; do not return today. Clinical evaluation required.",
      blocksReturnToPlay: true,
    };
  }
  if (report.severity === "severe") {
    return {
      escalateTo: ["parent", "coach", "clinician"],
      withinMinutes: 1,
      message: "Severe injury reported. Stop activity; arrange clinical evaluation.",
      blocksReturnToPlay: true,
    };
  }
  if (isArm && report.severity !== "mild") {
    return {
      escalateTo: ["parent", "coach"],
      withinMinutes: 5,
      message: "Throwing-arm pain reported. Pause throwing; clinical evaluation recommended.",
      blocksReturnToPlay: true,
    };
  }
  if (report.severity === "moderate") {
    return {
      escalateTo: ["parent", "coach"],
      withinMinutes: 10,
      message: "Moderate injury reported. Pause activity; monitor.",
      blocksReturnToPlay: true,
    };
  }
  return {
    escalateTo: ["coach"],
    withinMinutes: 60,
    message: "Mild discomfort logged. Coach should monitor and follow up.",
    blocksReturnToPlay: false,
  };
}
