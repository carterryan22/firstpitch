export function sanitizeRedirect(raw?: string): string | undefined {
  if (!raw) return undefined;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return undefined;
  if (/\p{Cc}/u.test(raw)) return undefined;
  if (raw.length > 256) return undefined;
  const base = "https://firstpitch.invalid";
  try {
    const target = new URL(raw, base);
    if (target.origin !== base) return undefined;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return undefined;
  }
}