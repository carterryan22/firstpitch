import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos, type TeamLeagueRules } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam, getTeamRoster } from "../../../../lib/teams";
import { Card } from "../../../../components/ui";
import { RulesSettingsForm } from "./RulesSettingsForm";

export const metadata = { title: "Team settings" };

function activeRuleCount(rules: TeamLeagueRules): number {
  return Object.values(rules).filter((v) => v !== undefined && v !== false && v !== 0).length;
}

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const team = await getRepos().teams.byId(id);
  if (!team) notFound();
  const initial: TeamLeagueRules = team.leagueRules ?? {};
  const appliedRuleSetId = team.appliedRuleSetId;
  const roster = await getTeamRoster(id);
  const memberCount =
    roster.coaches.length + roster.players.length + roster.parents.length;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}`} className="no-underline hover:underline">
            ← {team.name}
          </Link>
        </p>
        <h1 className="m-0">Team settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage <strong>{team.name}</strong>. Rules tagged{" "}
          <span className="badge-info text-[10px]">League rule</span> come from the rule set you
          applied; <span className="badge text-[10px]">Custom</span> rules are house tweaks you set
          yourself.
        </p>
      </header>

      {/* Team information */}
      <Card className="p-0 overflow-hidden">
        <details open className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4">
            <span className="flex items-center gap-2">
              <span className="text-base font-semibold text-slate-800">Team information</span>
              <span className="badge text-[10px]">{team.ageBand}</span>
            </span>
            <span className="text-slate-400 transition group-open:rotate-180">▾</span>
          </summary>
          <div className="border-t border-slate-100 px-5 py-4">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Team name</dt>
                <dd className="m-0 text-sm font-medium text-slate-800">{team.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Age band</dt>
                <dd className="m-0 text-sm font-medium text-slate-800">{team.ageBand}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Share link</dt>
                <dd className="m-0 text-sm font-mono text-slate-600">/t/{team.slug}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Created</dt>
                <dd className="m-0 text-sm text-slate-600">
                  {new Date(team.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </details>
      </Card>

      {/* Lineup rules */}
      <Card className="p-0 overflow-hidden">
        <details open className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4">
            <span className="flex items-center gap-2">
              <span className="text-base font-semibold text-slate-800">Lineup &amp; minimum play</span>
              <span className="badge-ok text-[10px]">{activeRuleCount(initial)} on</span>
            </span>
            <span className="text-slate-400 transition group-open:rotate-180">▾</span>
          </summary>
          <div className="space-y-4 border-t border-slate-100 px-5 py-4">
            <p className="m-0 text-xs text-slate-500">
              Applied automatically when you auto-generate a game lineup. The Rules &amp;
              Compliance panel on each game flags any innings that break these.
            </p>
            <RulesSettingsForm teamId={id} initial={initial} appliedRuleSetId={appliedRuleSetId} />
          </div>
        </details>
      </Card>

      {/* Members */}
      <Card className="p-0 overflow-hidden">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4">
            <span className="flex items-center gap-2">
              <span className="text-base font-semibold text-slate-800">Members</span>
              <span className="badge text-[10px]">{memberCount}</span>
            </span>
            <span className="text-slate-400 transition group-open:rotate-180">▾</span>
          </summary>
          <div className="space-y-4 border-t border-slate-100 px-5 py-4">
            {memberCount === 0 ? (
              <p className="m-0 text-sm text-slate-500">No members yet.</p>
            ) : (
              <>
                <MemberGroup title="Coaches" people={roster.coaches} badge="badge-info" />
                <MemberGroup title="Players" people={roster.players} badge="badge" />
                <MemberGroup title="Parents" people={roster.parents} badge="badge" />
              </>
            )}
          </div>
        </details>
      </Card>
    </div>
  );
}

function MemberGroup({
  title,
  people,
  badge,
}: {
  title: string;
  people: Array<{ user: { id: string; name?: string; email?: string } }>;
  badge: string;
}) {
  if (people.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
        {title} ({people.length})
      </p>
      <ul className="m-0 list-none space-y-1 p-0">
        {people.map(({ user }) => (
          <li key={user.id} className="flex items-center gap-2 text-sm text-slate-700">
            <span className={`${badge} text-[10px]`}>{title.slice(0, -1)}</span>
            <span className="font-medium">{user.name ?? "—"}</span>
            {user.email ? <span className="text-slate-400">· {user.email}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
