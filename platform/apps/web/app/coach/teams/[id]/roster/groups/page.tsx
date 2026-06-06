import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import type { PlayerRecord, GameRecord, Position } from "@platform/storage";
import {
  groupPlayers,
  GROUP_MODE_LABEL,
  GROUP_MODE_HINT,
  type GroupMode,
  type GroupingPlayer,
  type GroupPositionBucket,
} from "@platform/compiler";
import { getSession } from "../../../../../lib/session";
import { userCanManageTeam } from "../../../../../lib/teams";
import {
  sortRoster,
  fullName,
  playerHasHighThrowingLoad,
} from "../../../../../lib/players";
import { Card } from "../../../../../components/ui";

export const metadata = { title: "Practice groups" };

const MODES: GroupMode[] = ["balanced", "skill", "position", "buddy", "safety", "competition"];

const INFIELD: Position[] = ["1B", "2B", "3B", "SS"];
const OUTFIELD: Position[] = ["LF", "CF", "RF"];

function isMode(v: string | undefined): v is GroupMode {
  return MODES.includes(v as GroupMode);
}

function positionBucket(p: PlayerRecord): GroupPositionBucket {
  if (p.canPitch || p.canCatch) return "battery";
  const ratings = p.positionRatings ?? {};
  const preferred = (Object.keys(ratings) as Position[]).filter((k) => ratings[k] === "preferred");
  if (preferred.some((k) => k === "P" || k === "C")) return "battery";
  if (preferred.some((k) => INFIELD.includes(k))) return "infield";
  if (preferred.some((k) => OUTFIELD.includes(k))) return "outfield";
  return "utility";
}

export default async function GroupsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; groups?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const team = await repos.teams.byId(id);
  if (!team) notFound();
  const players = sortRoster(await repos.players.byTeam(id)).filter((p) => !p.archivedAt);
  const games = await repos.games.list({ teamId: id });

  const mode: GroupMode = isMode(sp.mode) ? sp.mode : "balanced";
  const requested = Number.parseInt(sp.groups ?? "", 10);
  const groupCount = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 8) : 3;

  const today = new Date();
  const groupingPlayers: GroupingPlayer[] = players.map((p) => {
    const gp: GroupingPlayer = { id: p.id, name: fullName(p) };
    if (typeof p.battingSkill === "number") gp.skill = p.battingSkill;
    if (p.canPitch) gp.canPitch = true;
    if (p.canCatch) gp.canCatch = true;
    if (p.injured) gp.injured = true;
    if (playerHasHighThrowingLoad(p, games, today)) gp.highThrowingLoad = true;
    gp.positionBucket = positionBucket(p);
    return gp;
  });

  const result = groupPlayers({ players: groupingPlayers, groupCount, mode });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}/roster`} className="no-underline hover:underline">
            ← {team.name} roster
          </Link>
        </p>
        <h1 className="mt-1">Practice groups</h1>
        <p className="mt-1 text-sm text-slate-500">
          Auto-build smart station groups from your roster ({players.length} players). Workload-aware:
          recently-used arms are steered to lower-volume stations.
        </p>
      </header>

      <Card>
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-sm">
            <span className="text-xs uppercase tracking-wide text-slate-500">Mode</span>
            <select name="mode" defaultValue={mode} className="select mt-1">
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {GROUP_MODE_LABEL[m]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm">
            <span className="text-xs uppercase tracking-wide text-slate-500">Groups</span>
            <input
              type="number"
              name="groups"
              min={1}
              max={8}
              defaultValue={groupCount}
              className="input mt-1 w-20"
            />
          </label>
          <button type="submit" className="btn-primary">
            Build groups
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-500">{GROUP_MODE_HINT[mode]}</p>
      </Card>

      {result.notes.length > 0 ? (
        <Card>
          <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">Coach notes</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
            {result.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {result.groups.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">No active players to group. Add players to the roster first.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {result.groups.map((g) => (
            <Card key={g.label}>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="m-0 text-base">{g.label}</h2>
                <span className="badge-info">avg skill {g.averageSkill}</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-800">
                {g.players.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <span>{p.name}</span>
                    {p.highThrowingLoad ? <span className="badge-warn">arm rest</span> : null}
                    {p.canCatch ? <span className="text-xs text-slate-400">C</span> : null}
                    {p.canPitch ? <span className="text-xs text-slate-400">P</span> : null}
                  </li>
                ))}
              </ul>
              {g.notes.length > 0 ? (
                <ul className="mt-3 list-disc pl-5 text-xs text-slate-600">
                  {g.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
