import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../../../lib/session";
import { userCanManageTeam } from "../../../../../../lib/teams";
import { formatGameWhen } from "../../../../../../lib/games";
import { Card } from "../../../../../../components/ui";
import { quickTagDef } from "../../../../../../lib/quickTags";
import { symptomsToPlan } from "../../../../../../lib/fixLastGame";
import { FixLastGameSymptoms } from "./FixLastGameSymptoms";

export const metadata = { title: "Fix last game" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DURATIONS = [60, 90, 120] as const;

export default async function FixLastGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; gameId: string }>;
  searchParams: Promise<{ duration?: string }>;
}) {
  const { id, gameId } = await params;
  const sp = await searchParams;
  const durationMin = DURATIONS.includes(Number(sp.duration) as (typeof DURATIONS)[number])
    ? Number(sp.duration)
    : 90;

  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const [team, game, tags] = await Promise.all([
    repos.teams.byId(id),
    repos.games.byId(gameId),
    repos.quickTags.list({ teamId: id, gameId }),
  ]);
  if (!team || !game || game.teamId !== id) notFound();

  // Only the team-scoped game symptoms (no playerId) drive the practice.
  const symptomTags = tags.filter((t) => !t.playerId && quickTagDef(t.code)?.focus);
  const current = symptomTags.map((t) => ({
    id: t.id,
    code: t.code,
    label: quickTagDef(t.code)?.label ?? t.code,
  }));
  const plan = symptomsToPlan(
    symptomTags.map((t) => t.code),
    { teamId: id, durationMin },
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}/games/${gameId}`} className="no-underline hover:underline">
            ← {game.opponent ? `vs ${game.opponent}` : "Game"}
          </Link>
        </p>
        <h1 className="m-0">Fix last game</h1>
        <p className="mt-1 text-sm text-slate-600">
          {formatGameWhen(game.startsAt)} · Tap what you saw and we&apos;ll turn it into your top
          priorities and a focused practice plan.
        </p>
      </header>

      <Card>
        <FixLastGameSymptoms teamId={id} gameId={gameId} current={current} />
      </Card>

      {plan.priorities.length > 0 ? (
        <Card className="space-y-4 border-field-700">
          <div>
            <h2 className="m-0 text-base font-semibold text-slate-900">
              Top {plan.priorities.length} {plan.priorities.length === 1 ? "priority" : "priorities"}
            </h2>
            <ol className="mt-2 space-y-2">
              {plan.priorities.map((p, i) => (
                <li key={p.code} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-field-700 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-semibold text-slate-800">{p.label}</span>
                    {p.count > 1 ? (
                      <span className="ml-1 text-xs text-slate-500">(seen {p.count}×)</span>
                    ) : null}
                    <span className="block text-xs text-slate-600">{p.why}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Practice length
            </span>
            {DURATIONS.map((d) => (
              <Link
                key={d}
                href={`?duration=${d}`}
                className={
                  d === durationMin
                    ? "rounded bg-teal-600 px-3 py-1 text-sm text-white no-underline"
                    : "rounded border border-slate-200 px-3 py-1 text-sm text-slate-600 no-underline hover:border-slate-400"
                }
              >
                {d} min
              </Link>
            ))}
          </div>

          <Link href={plan.practiceHref} className="btn-primary inline-block min-h-[44px] no-underline">
            Build the {durationMin}-min practice →
          </Link>
          <p className="m-0 text-xs text-slate-500">
            Pre-loads the builder with {plan.focus.join(", ")}. Every plan still runs the safety
            corpus + Pitch Smart gate before it ships.
          </p>
        </Card>
      ) : (
        <Card>
          <p className="m-0 text-sm text-slate-500">
            Tap a symptom above to get your top priorities and a ready-to-build practice.
          </p>
        </Card>
      )}
    </div>
  );
}
