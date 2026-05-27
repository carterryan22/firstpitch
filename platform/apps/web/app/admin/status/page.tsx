import { loadSafetyRules, loadDrills, loadAgeMatrix, loadPitchSmart } from "@platform/corpus";
import { runAll } from "@platform/eval";
import { redirect } from "next/navigation";
import { StatCard, Card, Badge } from "../../components/ui";
import { getSession } from "../../lib/session";

export const metadata = { title: "Platform status" };
export const dynamic = "force-dynamic";

const APIS: Array<{ path: string; group: string; note: string }> = [
  { path: "/api/compile", group: "Practice", note: "Compile a practice plan from age + duration + focus." },
  { path: "/api/safety/check", group: "Practice", note: "Run a plan or activity against the safety corpus." },
  { path: "/api/dont-do-today", group: "Practice", note: "Daily 'do not do' query for a player." },
  { path: "/api/diagnose", group: "Analysis", note: "Driver-tree diagnosis from a metric snapshot." },
  { path: "/api/retrieve", group: "AI", note: "RAG retrieval over the Tier-1 corpus." },
  { path: "/api/coach-chat", group: "AI", note: "Coach-facing grounded chat." },
  { path: "/api/escalate", group: "Safety", note: "Escalate a self-reported issue to coach + parent." },
  { path: "/api/eval", group: "Quality", note: "Run the in-process eval suite." },
  { path: "/api/drills", group: "Catalog", note: "List published drills." },
  { path: "/api/missions", group: "Catalog", note: "List parent-facing home missions for an age." },
  { path: "/api/ingest", group: "Integrations", note: "Upload device or score-tracker exports." },
  { path: "/api/auth/session", group: "Auth", note: "Read the current session." },
];

export default async function StatusPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const rules = loadSafetyRules().rules;
  const drills = loadDrills();
  const matrix = loadAgeMatrix();
  const pitch = loadPitchSmart();
  const evalRun = runAll();

  const grouped = APIS.reduce<Record<string, typeof APIS>>((acc, api) => {
    (acc[api.group] ??= []).push(api);
    return acc;
  }, {});

  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <h1>Platform status</h1>
        <p className="mt-2 text-slate-600">
          Live snapshot of the corpus, eval suite, and HTTP surface. This page exists for operators
          — coaches and parents never need it.
        </p>
      </header>

      <section className="flex flex-wrap gap-3">
        <StatCard label="Tier-1 safety rules" value={rules.length} />
        <StatCard label="Drills published" value={drills.filter((d) => d.review_status === "published").length} />
        <StatCard label="Age-band matrix" value={matrix.bands.length} />
        <StatCard label="Pitch Smart tables" value={pitch.age_tables.length} />
        <StatCard
          label="Eval suite"
          value={`${evalRun.passed}/${evalRun.total}`}
          tone={evalRun.failed === 0 ? "ok" : "danger"}
        />
      </section>

      {evalRun.failed > 0 ? (
        <Card className="border-danger/30 bg-danger-soft/40">
          <h3 className="m-0 text-danger">{evalRun.failed} eval failures</h3>
          <ul className="mt-2 list-disc pl-6 text-sm">
            {evalRun.failures.slice(0, 10).map((f) => (
              <li key={f.id}>
                <code>{f.id}</code> — {f.description}{" "}
                <em className="text-slate-600">({f.detail})</em>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center gap-3">
            <Badge tone="ok">All checks pass</Badge>
            <span className="text-sm text-slate-600">
              {evalRun.passed} of {evalRun.total} assertions across {rules.length} safety rules.
            </span>
          </div>
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="m-0">HTTP API</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(grouped).map(([group, items]) => (
            <Card key={group}>
              <h3 className="m-0 text-sm uppercase tracking-wide text-slate-500">{group}</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {items.map((it) => (
                  <li key={it.path} className="flex flex-col">
                    <code className="bg-slate-100 px-1.5 py-0.5 text-xs">{it.path}</code>
                    <span className="mt-0.5 text-xs text-slate-600">{it.note}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
