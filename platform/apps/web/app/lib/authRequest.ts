import type { Role } from "@platform/auth";

const PUBLIC_ROLES: Role[] = ["coach", "parent", "player"];

/** Accept only local paths, including after WHATWG URL normalization. */
export function sanitizeRedirect(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.length > 256 || !raw.startsWith("/") || raw.startsWith("//")) {
    return undefined;
  }
  if (/[\\\u0000-\u0020\u007f]/.test(raw)) return undefined;
  const origin = "https://firstpitch.invalid";
  try {
    const url = new URL(raw, origin);
    // Routes resolve this returned path again. Dot segments must not normalize
    // into a protocol-relative path such as /.//outside.example -> //outside.example.
    if (url.origin !== origin || url.pathname.startsWith("//")) return undefined;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}

/** Public sign-up may create ordinary accounts, but never administrator accounts. */
export function publicLoginRole(value: unknown): Role | null {
  return typeof value === "string" && PUBLIC_ROLES.includes(value as Role)
    ? (value as Role)
    : null;
}
