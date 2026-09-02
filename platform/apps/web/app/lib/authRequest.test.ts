import { describe, expect, it } from "vitest";
import { publicLoginRole } from "./authRequest";

describe("publicLoginRole", () => {
  it.each(["coach", "parent", "player"])("allows ordinary role %s", (role) => {
    expect(publicLoginRole(role)).toBe(role);
  });

  it.each(["admin", "owner", "", undefined, null])("rejects privileged or invalid role %s", (role) => {
    expect(publicLoginRole(role)).toBeNull();
  });
});
