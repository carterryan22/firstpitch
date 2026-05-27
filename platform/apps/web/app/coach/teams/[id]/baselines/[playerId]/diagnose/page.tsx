import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../../../lib/session";
import { userCanManageTeam } from "../../../../../../lib/teams";
import { fullName } from "../../../../../../lib/players";
import { Card } from "../../../../../../components/ui";
import { diagnosePlayer, diagnosableOutcomes } from "../../../../../../lib/diagnose";

export const metadata = { title: "Diagnose player" };

export default async function DiagnosePlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; playerId: string }>;
  searchParams: Promise<{ outcome?: string }>;
}) {
  const { id, playerId } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const [team, player, entries] = await Promise.all([
    repos.teams.byId(id),
    repos.players.byId(playerId),
    repos.metricEntries.list({ playerId }),
  ]);
  if (!team || !player || player.teamId !== id) notFound();

  const outcomes = diagnosableOutcomes();
  const outcomeDriverKey = sp.outcome ?? outcomes[0]!.driverKey;
  const result = diagnosePlayer({
    outcomeDriverKey,
    ageBand: team.ageBand,
    entries,
  });

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
        <h1 className="mt-1">Diagnose underperformance</h1>
        <p className="mt-1 text-sm text-slate-500">
          Age band {team.ageBand} · {entries.length} stored entries · only verified entries
          (defaults to self-entered or higher) are considered.
        </p>
      </header>

      <Card>
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-sm">
            <span className="text-xs uppercase tracking-wide text-slate-500">Outcome metric</span>
            <select name="outcome" defaultValue={outcomeDriverKey} className="select mt-1">
              {outcomes.map((o) => (
                <option key={o.driverKey} value={o.driverKey}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn">
            Run diagnosis
          </button>
        </form>
      </Card>

      {result.diagnoses.length === 0 ? (
        <Card>
          <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">No diagnosis</h2>
          <ul className="mt-2 list-disc pl-6 text-sm text-slate-700">
            {result.insufficientData.length > 0 ? (
              result.insufficientData.map((m, i) => <li key={i}>{m}</li>)
            ) : (
              <li>No driver triggered for this outcome at the current verification floor.</li>
            )}
          </ul>
        </Card>
      ) : (
        <section className="space-y-3">
          {result.diagnoses.map((d) => (
            <Card key={d.driver.key}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="m-0 text-base">{d.driver.label}</h2>
                <span
                  className={
                    d.confidence === "high"
                      ? "badge-ok"
                      : d.confidence === "medium"
                      ? "badge-info"
                      : "badge-warn"
                  }
                >
                  {d.confidence} confidence
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{d.rationale}</p>
              {d.evidence.length > 0 ? (
                <div className="mt-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Evidence</div>
                  <ul className="mt-1 list-disc pl-6 text-sm text-slate-700">
                    {d.evidence.map((e, i) => (
                      <li key={i}>
                        <code className="bg-slate-100 px-1">{e.metricKey}</code> = {e.value}{" "}
                        <span className="text-slate-500">
                          (expected {e.expected.min}–
                          {Number.isFinite(e.expected.max) ? e.expected.max : "∞"})
                        </span>{" "}
                        · {e.verification}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {d.recommendedDrillIds.length > 0 ? (
                <div className="mt-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Recommended drills
                  </div>
                  <ul className="mt-1 flex flex-wrap gap-2 text-sm">
                    {d.recommendedDrillIds.map((id) => (
                      <li key={id}>
                        <Link
                          href={`/drills#${id}`}
                          className="rounded bg-brand-50 px-2 py-1 text-brand-700 no-underline hover:underline"
                        >
                          {id}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
