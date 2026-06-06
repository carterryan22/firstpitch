import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WoS URL-grammar parity: the reference IA addresses team surfaces as
// `/teams/{slug}/roster`, `/teams/{slug}/games/{id}`, etc. Our coach surfaces
// live at `/coach/teams/{id}/…` (id-based, auth-gated). This catch-all resolves
// the slug to a team id and forwards to the canonical coach route, so external
// deep-links and the documented grammar both work. The destination page does
// its own auth/visibility checks.
export default async function TeamSlugDeepLink({
  params,
}: {
  params: Promise<{ slug: string; rest: string[] }>;
}) {
  const { slug, rest } = await params;
  const team = await getRepos().teams.bySlug(slug);
  if (!team) notFound();
  const sub = (rest ?? []).map((s) => encodeURIComponent(s)).join("/");
  redirect(`/coach/teams/${team.id}${sub ? `/${sub}` : ""}`);
}
