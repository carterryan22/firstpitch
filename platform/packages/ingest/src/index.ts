// @platform/ingest — E4.3 GameChanger-style filtered CSV importer
// plus device adapters for Rapsodo, Blast, HitTrax.
// Pure functions; no I/O. Caller hands us the raw CSV text and the roster.

export * from "./csv";
export * from "./gameChanger";
export * from "./nameMatch";
export * from "./icsSchedule";
export * from "./device";
export * from "./rapsodo";
export * from "./blast";
export * from "./hitTrax";
