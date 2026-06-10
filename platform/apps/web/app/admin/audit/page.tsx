import Link from "next/link";
import { redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../lib/session";
import { Card } from "../../components/ui";

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

type SearchParams = { user?: string; action?: string; resource?: string; limit?: string };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const sp = await searchParams;
  const limit = Math.min(500, Math.max(10, Number(sp.limit ?? "100") || 100));

  const repos = getRepos();
  const [allEntries, users] = await Promise.all([
    repos.audit.list({
      ...(sp.user ? { userId: sp.user } : {}),
      ...(sp.resource ? { resource: sp.resource } : {}),
    }),
    repos.users.list(),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));

  const filtered = allEntries
    .filter((e) => !sp.action || e.action.toLowerCase().includes(sp.action.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

  const actionCounts = new Map<string, number>();
  for (const e of allEntries) actionCounts.set(e.action, (actionCounts.get(e.action) ?? 0) + 1);
  const topActions = Array.from(actionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">Admin</p>
        <h1 className="mt-1">Audit log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Immutable history of safety-relevant actions across the platform.
        </p>
      </header>

      <Card>
        <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">Top actions</h2>
        <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          {topActions.map(([action, count]) => (
            <li key={action} className="flex items-center justify-between border-b border-slate-100 py-1">
              <Link href={`/admin/audit?action=${encodeURIComponent(action)}`} className="font-mono text-xs">
                {action}
              </Link>
              <span className="text-xs text-slate-500">{count}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <form className="grid gap-3 sm:grid-cols-4" method="get">
          <div>
            <label className="label" htmlFor="user">User ID</label>
            <input id="user" name="user" className="input" defaultValue={sp.user ?? ""} placeholder="usr_…" />
          </div>
          <div>
            <label className="label" htmlFor="action">Action contains</label>
            <input id="action" name="action" className="input" defaultValue={sp.action ?? ""} placeholder="coach_ask" />
          </div>
          <div>
            <label className="label" htmlFor="resource">Resource</label>
            <input id="resource" name="resource" className="input" defaultValue={sp.resource ?? ""} placeholder="team:tm_…" />
          </div>
          <div>
            <label className="label" htmlFor="limit">Limit</label>
            <input id="limit" name="limit" className="input" defaultValue={String(limit)} />
          </div>
          <div className="sm:col-span-4 flex justify-end gap-2">
            <Link className="btn-ghost text-sm" href="/admin/audit">Reset</Link>
            <button type="submit" className="btn-primary text-sm">Filter</button>
          </div>
        </form>
      </Card>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Resource</th>
              <th className="px-3 py-2">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((e) => {
              const u = e.userId ? userById.get(e.userId) : undefined;
              return (
                <tr key={e.id} className="align-top">
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {u ? (
                      <>
                        <div>{u.name ?? u.email}</div>
                        <div className="text-[10px] text-slate-400">{e.userId}</div>
                      </>
                    ) : (
                      <span className="font-mono text-[10px] text-slate-400">{e.userId ?? "-"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link href={`/admin/audit?action=${encodeURIComponent(e.action)}`}>{e.action}</Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">{e.resource}</td>
                  <td className="px-3 py-2 text-xs">
                    {e.metadata ? (
                      <pre className="m-0 whitespace-pre-wrap text-[11px] text-slate-600">
                        {JSON.stringify(e.metadata)}
                      </pre>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                  No audit entries match the current filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-slate-500">
        Showing {filtered.length} of {allEntries.length} entries.
      </p>
    </div>
  );
}
