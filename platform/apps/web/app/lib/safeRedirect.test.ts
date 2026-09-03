import { describe, expect, it } from "vitest";
import { sanitizeRedirect } from "./safeRedirect";

describe("sanitizeRedirect", () => {
  it("keeps same-app paths, queries, and fragments", () => {
    expect(sanitizeRedirect("/parent?team=t1#today")).toBe("/parent?team=t1#today");
  });

  it("rejects protocol-relative, backslash, control, and absolute URLs", () => {
    expect(sanitizeRedirect("//evil.example/path")).toBeUndefined();
    expect(sanitizeRedirect("/\\evil.example/path")).toBeUndefined();
    expect(sanitizeRedirect("/parent\n/evil")).toBeUndefined();
    expect(sanitizeRedirect("https://evil.example/path")).toBeUndefined();
  });

  it("normalizes dot segments without leaving the app origin", () => {
    expect(sanitizeRedirect("/coach/../parent")).toBe("/parent");
    expect(sanitizeRedirect("/%2e%2e/%2e%2e/parent")).toBe("/parent");
  });
});