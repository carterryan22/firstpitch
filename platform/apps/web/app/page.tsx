import Link from "next/link";
import { loadSafetyRules, loadDrills, loadAgeMatrix, loadPitchSmart } from "@platform/corpus";
import { runAll } from "@platform/eval";
import { getSession } from "./lib/session";
import { StatCard, Card, Badge } from "./components/ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Catch each call separately so a failure renders a debug page instead of a
  // sanitized 500 with only a digest. Safe to remove once the deploy is green.
  const debug: Record<string, string> = {};
  let rules: ReturnType<typeof loadSafetyRules>["rules"] = [];
  let drills: ReturnType<typeof loadDrills> = [];
  let matrix = { bands: [] } as unknown as ReturnType<typeof loadAgeMatrix>;
  let pitch = { age_tables: [] } as unknown as ReturnType<typeof loadPitchSmart>;
  let evalRun = { passed: 0, failed: 0, total: 0, failures: [] } as unknown as ReturnType<typeof runAll>;
  let session: Awaited<ReturnType<typeof getSession>> = null;

  try { rules = loadSafetyRules().rules; } catch (e) { debug.loadSafetyRules = (e as Error).stack ?? String(e); }
  try { drills = loadDrills(); } catch (e) { debug.loadDrills = (e as Error).stack ?? String(e); }
  try { matrix = loadAgeMatrix(); } catch (e) { debug.loadAgeMatrix = (e as Error).stack ?? String(e); }
  try { pitch = loadPitchSmart(); } catch (e) { debug.loadPitchSmart = (e as Error).stack ?? String(e); }
  try { evalRun = runAll(); } catch (e) { debug.runAll = (e as Error).stack ?? String(e); }
  try { session = await getSession(); } catch (e) { debug.getSession = (e as Error).stack ?? String(e); }

  if (Object.keys(debug).length > 0) {
    return (
      <div style={{ fontFamily: "system-ui", padding: "1rem" }}>
        <h1 style={{ color: "#b91c1c" }}>Boot failures</h1>
        {Object.entries(debug).map(([k, v]) => (
          <details key={k} open style={{ marginBottom: 16 }}>
            <summary><strong>{k}</strong></summary>
            <pre style={{ whiteSpace: "pre-wrap", background: "#f1f5f9", padding: "0.75rem", borderRadius: 6, fontSize: 12 }}>{v}</pre>
          </details>
        ))}
        <p style={{ fontSize: 12, color: "#475569" }}>
          Remove the try/catch in app/page.tsx once these are fixed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h1>Player Development Platform</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Safety-first youth athlete training, backed by Pitch Smart, an age-band matrix, and a
          typed drill library. Every recommendation is rule-checked before delivery.
        </p>
      </section>

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

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3>Coaches</h3>
          <p className="mt-1 text-sm text-slate-600">Compile plans, review players, talk to the AI coach.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/coach" className="btn-primary no-underline hover:no-underline">Coach console</Link>
            <Link href="/practice/new" className="btn-ghost no-underline hover:no-underline">New practice</Link>
            <Link href="/coach/chat" className="btn-ghost no-underline hover:no-underline">Coach chat</Link>
          </div>
        </Card>
        <Card>
          <h3>Players &amp; parents</h3>
          <p className="mt-1 text-sm text-slate-600">Drills, missions, and what&apos;s safe today.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/parent" className="btn-ghost no-underline hover:no-underline">Parent view</Link>
            <Link href="/drills" className="btn-ghost no-underline hover:no-underline">Drill library</Link>
            <Link href="/missions?age=11" className="btn-ghost no-underline hover:no-underline">Missions</Link>
            <Link href="/safety" className="btn-ghost no-underline hover:no-underline">Safety rules</Link>
          </div>
        </Card>
      </section>

      <section>
        <h2>APIs</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            "/api/compile",
            "/api/safety/check",
            "/api/eval",
            "/api/diagnose",
            "/api/retrieve",
            "/api/drills",
            "/api/missions",
            "/api/ingest",
            "/api/dont-do-today",
            "/api/escalate",
            "/api/coach-chat",
            "/api/auth/session",
          ].map((p) => (
            <code key={p}>{p}</code>
          ))}
        </div>
      </section>

      {!session && (
        <Card className="border-brand-500/40 bg-brand-50/60">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-brand-900">Sign in to unlock the coach console</h3>
              <p className="text-sm text-slate-600">
                Local-only dev sign-in. Plans, missions, and ingest write to the local data store.
              </p>
            </div>
            <Link href="/login" className="btn-primary no-underline hover:no-underline">
              Sign in
            </Link>
          </div>
        </Card>
      )}

      {evalRun.failed > 0 ? (
        <Card className="border-danger/30 bg-danger-soft/40">
          <h3 className="text-danger">{evalRun.failed} eval failures</h3>
          <ul className="mt-2 list-disc pl-6 text-sm">
            {evalRun.failures.slice(0, 5).map((f) => (
              <li key={f.id}>
                <code>{f.id}</code> — {f.description} <em className="text-slate-600">({f.detail})</em>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center gap-3">
            <Badge tone="ok">eval pass</Badge>
            <span className="text-sm text-slate-600">
              {evalRun.passed} of {evalRun.total} assertions pass across {rules.length} safety rules.
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
