import type { Role } from "@platform/auth";

const PUBLIC_ROLES: Role[] = ["coach", "parent", "player"];

/** Public sign-up may create ordinary accounts, but never administrator accounts. */
export function publicLoginRole(value: unknown): Role | null {
  return typeof value === "string" && PUBLIC_ROLES.includes(value as Role)
    ? (value as Role)
    : null;
}
