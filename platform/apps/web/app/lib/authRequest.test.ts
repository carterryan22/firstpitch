import { describe, expect, it } from "vitest";
import { publicLoginRole, sanitizeRedirect } from "./authRequest";

describe("publicLoginRole", () => {
  it.each(["coach", "parent", "player"])("allows ordinary role %s", (role) => {
    expect(publicLoginRole(role)).toBe(role);
  });

  it.each(["admin", "owner", "", undefined, null])("rejects privileged or invalid role %s", (role) => {
    expect(publicLoginRole(role)).toBeNull();
  });
});

describe("sanitizeRedirect", () => {
  it.each(["/coach", "/parent?tab=progress#recent", "/coach/teams/demo"])("preserves local destination %s", (path) => {
    expect(sanitizeRedirect(path)).toBe(path);
  });
  it.each(["https://outside.example", "//outside.example", "/\\outside.example", "/.//outside.example", "/a/..//outside.example", "/%2e//outside.example", "/\t/outside.example", "/\n/outside.example", "/\r/outside.example", "/coach\u0000", " /coach", "/" + "a".repeat(256), undefined, null, 123])("rejects unsafe destination %s", (path) => {
    expect(sanitizeRedirect(path)).toBeUndefined();
  });
});
