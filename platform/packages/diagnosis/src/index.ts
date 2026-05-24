// @platform/diagnosis — E10. Verified-number-only diagnosis engine.
// Encodes core §9 driver trees: each metric maps to candidate drivers; we
// rank by available evidence and emit a Diagnosis with calibrated confidence.
// IMPORTANT: never invents a diagnosis. Returns null when evidence is insufficient.

export * from "./driverCatalog";
export * from "./engine";
