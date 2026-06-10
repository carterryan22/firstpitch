// @platform/research — competitor/market-research corpus engine.
// Loads, validates, scores, and renders the structured signal under
// corpus/competitor-research/. See competitor-research-corpus-plan.md.
//
// SERVER/TOOLING ONLY: this module statically inlines the corpus JSON.

export * from "./types";
export * from "./load";
export * from "./score";
export * from "./validate";
export * from "./matrix";
export * from "./report";
