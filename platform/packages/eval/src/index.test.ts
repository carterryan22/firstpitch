import { describe, it, expect } from "vitest";
import { runAll, allCases } from "./index";

describe("eval harness", () => {
  it("generates a substantial assertion suite from the corpus", () => {
    const cases = allCases();
    expect(cases.length).toBeGreaterThan(50);
  });

  it("every generated assertion passes", () => {
    const run = runAll();
    if (run.failed > 0) {
      // Surface up to 10 failures for diagnosis
      console.error("Eval failures:", run.failures.slice(0, 10));
    }
    expect(run.failed).toBe(0);
    expect(run.passed).toBe(run.total);
  });
});
