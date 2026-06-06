import { getRepos } from "@platform/storage";
import { TeamTabs } from "./TeamTabs";

/**
 * Team shell: persistent 5-tab navigation (WoS §2.3) around every
 * `/coach/teams/{id}/...` surface. Auth + 404 stay on the individual pages;
 * this layout only adds the tab chrome and bottom padding so the fixed mobile
 * tab bar never overlaps page content.
 */
export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = await getRepos().teams.byId(id);

  return (
    <div className="pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0">
      {team ? (
        <div className="mb-6">
          <span className="badge-info text-[11px]">{team.name}</span>
          <div className="mt-2">
            <TeamTabs teamId={id} />
          </div>
        </div>
      ) : null}
      {children}
    </div>
  );
}
