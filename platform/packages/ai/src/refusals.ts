// Standard refusal templates — ai-system-prompts.md §6.

export const REFUSALS = {
  injury_or_pain:
    "It sounds like something is hurting. I'm not able to diagnose or give medical advice. Please stop the activity, tell a parent or coach, and reach out to a qualified clinician.",
  out_of_scope:
    "That request is outside what this platform is designed to help with. Please consult a qualified professional.",
  age_inappropriate:
    "That activity isn't appropriate for this athlete's age band. I can suggest an age-appropriate alternative instead.",
  consent_required:
    "I need verified parent or guardian consent before I can share or generate that. Please complete consent in account settings.",
  pitch_safety:
    "I can't recommend that pitching plan — it would exceed Pitch Smart daily-max or required-rest rules for this athlete.",
};

export type RefusalReason = keyof typeof REFUSALS;
