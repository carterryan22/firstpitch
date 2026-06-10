import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../../../lib/session";
import { userCanManageTeam } from "../../../../../../lib/teams";
import { fullName } from "../../../../../../lib/players";
import { Card } from "../../../../../../components/ui";
import { PillarRadar } from "../../../../../../components/PillarRadar";
import {
  buildDevProfile,
  bandLabel,
  bandBadgeClass,
  confidenceBadgeClass,
  readinessBadgeClass,
  READINESS_LABEL,
  PILLAR_WEIGHT,
  type PillarScore,
} from "../../../../../../lib/devProfile";

export const metadata = { title: "Development profile" };

const CONF_LABEL: Record<string, string> = {
  none: "no data",
  low: "low confidence",
  medium: "medium confidence",
  high: "high confidence",
};

function pillarBarColor(score: number | null): string {
  if (score === null) return "#CBD5E1";
  if (score >= 68) return "#4A6318";
  if (score >= 50) return "#107A57";
  return "#B45309";
}

function PillarCard({ p }: { p: PillarScore }) {
  const weightPct = Math.round((PILLAR_WEIGHT[p.pillar] ?? 0) * 100);
  return (
    <div className="card">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          {p.label}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-slate-400">{weightPct}%</div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {p.pillar === "durability" && p.readiness ? (
          <span className={readinessBadgeClass(p.readiness)}>{READINESS_LABEL[p.readiness]}</span>
        ) : (
          <span className={bandBadgeClass(p.band)}>{bandLabel(p.band)}</span>
        )}
        <span className={confidenceBadgeClass(p.confidence)}>{CONF_LABEL[p.confidence]}</span>
      </div>

      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{
            width: `${p.score === null ? 6 : Math.max(4, p.score)}%`,
            backgroundColor: pillarBarColor(p.score),
          }}
        />
      </div>

      <p className="mt-2 text-xs text-slate-600">{p.note}</p>
      {p.drivers.length > 0 ? (
        <p className="mt-1 text-[11px] text-slate-400">{p.drivers.join(" · ")}</p>
      ) : null}
    </div>
  );
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string; playerId: string }>;
}) {
  const { id, playerId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const [team, player, metrics, gameStats, games, plans, missionAssignments, missionCompletions] =
    await Promise.all([
      repos.teams.byId(id),
      repos.players.byId(playerId),
      repos.metricEntries.list({ playerId }),
      repos.playerGameStats.list({ playerId }),
      repos.games.list({ teamId: id }),
      repos.plans.list({ teamId: id }),
      repos.missionAssignments.list({ playerId }),
      repos.missionCompletions.list({ playerId }),
    ]);
  if (!team || !player || player.teamId !== id) notFound();

  const profile = buildDevProfile({
    player,
    metrics,
    gameStats,
    games,
    plans,
    missionAssignments,
    missionCompletions,
  });

  const rec = profile.recommendation;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link
            href={`/coach/teams/${id}/baselines/${playerId}`}
            className="no-underline hover:underline"
          >
            ← {fullName(player)} baselines
          </Link>
        </p>
        <h1 className="mt-1">Development profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Age band {team.ageBand} · the five pillars of a strong player. {profile.shapeSummary}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">The shape</h2>
          <div className="mt-2 flex justify-center">
            <PillarRadar pillars={profile.pillars} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{profile.confidenceNote}</p>
        </Card>

        <Card>
          <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">
            What to work on next
          </h2>

          {rec.safetyNote ? (
            <div className="mt-3 rounded-md border-2 border-amber-300 bg-amber-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-amber-800">
                Safety first
              </div>
              <p className="mt-1 text-sm text-amber-900">{rec.safetyNote}</p>
            </div>
          ) : null}

          <p className="mt-3 text-base font-semibold text-slate-800">{rec.headline}</p>
          <ul className="mt-2 space-y-2">
            {rec.actions.map((a, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span aria-hidden className="mt-0.5 text-emerald-700">
                  →
                </span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <section>
        <h2>The five pillars</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profile.pillars.map((p) => (
            <PillarCard key={p.pillar} p={p} />
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          A development profile, not a ranking. Bands describe where a player is today against
          age-appropriate expectations — they are private coaching tools, never a leaderboard.
        </p>
      </section>
    </div>
  );
}
