import { Badge, Card } from "./ui";

// Mirrors @platform/compiler CompiledBlock without importing it (avoids server/client coupling).
export interface PlanBlock {
  blockId: string;
  type: "warmup" | "skill" | "rest" | "game" | "cooldown";
  durationMin: number;
  drill: {
    drill_id: string;
    name: string;
    short_description: string;
    coaching_cues: string[];
    safety_flags?: string[];
    throw_count_contribution?: number;
    intensity?: string;
    kid_friendly?: {
      explain: string;
      goal: string;
      why: string;
    };
  } | null;
  notes: string[];
}

export interface PlanSummary {
  name?: string;
  ageBand: string;
  durationMin: number;
  blocks: PlanBlock[];
  warnings?: string[];
  blocked?: string[];
  totalThrowingLoad?: number;
  qualityScore?: number;
  focus?: string[];
  antiLine?: {
    ok: boolean;
    flaggedBlocks: Array<{ blockId: string; ratio: number; suggestedStations: number }>;
  };
}

const TYPE_LABEL: Record<PlanBlock["type"], string> = {
  warmup: "Warm-up",
  skill: "Skill block",
  rest: "Rest",
  game: "Game / competition",
  cooldown: "Cool-down",
};

const TYPE_TONE: Record<PlanBlock["type"], "info" | "ok" | "warn"> = {
  warmup: "info",
  skill: "ok",
  rest: "warn",
  game: "ok",
  cooldown: "info",
};

export function PlanHeader({ plan }: { plan: PlanSummary }) {
  const stats: Array<{ label: string; value: string | number; tone?: "info" | "ok" | "warn" | "danger" }> = [
    { label: "Age band", value: plan.ageBand },
    { label: "Duration", value: `${plan.durationMin} min` },
  ];
  if (typeof plan.totalThrowingLoad === "number") {
    stats.push({
      label: "Throwing load",
      value: `${plan.totalThrowingLoad} throws`,
      tone: plan.totalThrowingLoad > 60 ? "warn" : "info",
    });
  }
  if (typeof plan.qualityScore === "number") {
    stats.push({
      label: "Quality score",
      value: plan.qualityScore.toFixed(2),
      tone: plan.qualityScore >= 0.8 ? "ok" : plan.qualityScore >= 0.5 ? "warn" : "danger",
    });
  }
  return (
    <div className="flex flex-wrap gap-3">
      {stats.map((s) => (
        <div key={s.label} className="stat-card min-w-[140px]">
          <div className="stat-label">{s.label}</div>
          <div
            className={`stat-value ${
              s.tone === "ok"
                ? "text-ok"
                : s.tone === "warn"
                ? "text-warn"
                : s.tone === "danger"
                ? "text-danger"
                : "text-slate-900"
            }`}
          >
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PlanWarnings({ plan }: { plan: PlanSummary }) {
  const hasBlocked = (plan.blocked?.length ?? 0) > 0;
  const hasWarn = (plan.warnings?.length ?? 0) > 0;
  const antiLine = plan.antiLine;
  const hasAntiLine = !!(antiLine && !antiLine.ok && antiLine.flaggedBlocks.length > 0);
  if (!hasBlocked && !hasWarn && !hasAntiLine) return null;
  return (
    <div className="space-y-3">
      {hasBlocked ? (
        <Card className="border-danger/30 bg-danger-soft/40">
          <div className="flex items-center gap-2">
            <Badge tone="danger">Hard block</Badge>
            <span className="font-medium text-danger">
              {plan.blocked!.length} item{plan.blocked!.length === 1 ? "" : "s"} removed
            </span>
          </div>
          <ul className="mt-2 list-disc pl-6 text-sm text-slate-800">
            {plan.blocked!.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </Card>
      ) : null}
      {hasWarn ? (
        <Card className="border-warn/30 bg-warn-soft/40">
          <div className="flex items-center gap-2">
            <Badge tone="warn">Warnings</Badge>
            <span className="font-medium text-warn">
              {plan.warnings!.length} note{plan.warnings!.length === 1 ? "" : "s"} for the coach
            </span>
          </div>
          <ul className="mt-2 list-disc pl-6 text-sm text-slate-800">
            {plan.warnings!.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Card>
      ) : null}
      {hasAntiLine ? (
        <Card className="border-warn/30 bg-warn-soft/40">
          <div className="flex items-center gap-2">
            <Badge tone="warn">Too many in line</Badge>
            <span className="font-medium text-warn">
              {antiLine!.flaggedBlocks.length} block
              {antiLine!.flaggedBlocks.length === 1 ? "" : "s"} would crowd one station
            </span>
          </div>
          <ul className="mt-2 list-disc pl-6 text-sm text-slate-800">
            {antiLine!.flaggedBlocks.map((f) => (
              <li key={f.blockId}>
                <code className="text-xs">{f.blockId}</code> — about {f.ratio} players per station.
                Split into <strong>{f.suggestedStations}</strong> stations to keep everyone active.
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-600">
            Add more coaches or field resources on the left to lift the cap.
          </p>
        </Card>
      ) : null}
    </div>
  );
}

export function PlanTimeline({ blocks }: { blocks: PlanBlock[] }) {
  let cursor = 0;
  return (
    <ol className="space-y-3">
      {blocks.map((b, i) => {
        const start = cursor;
        cursor += b.durationMin;
        return (
          <li key={b.blockId ?? i}>
            <Card>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-500">
                    {String(start).padStart(2, "0")}:00
                  </span>
                  <Badge tone={TYPE_TONE[b.type]}>{TYPE_LABEL[b.type]}</Badge>
                  <span className="font-medium text-slate-900">
                    {b.drill?.name ?? "Open block"}
                  </span>
                </div>
                <span className="text-sm text-slate-500">{b.durationMin} min</span>
              </div>
              {b.drill ? (
                <p className="mt-2 text-sm text-slate-600">{b.drill.short_description}</p>
              ) : null}
              {b.drill?.coaching_cues?.length ? (
                <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                  {b.drill.coaching_cues.slice(0, 3).map((c, j) => (
                    <li key={j}>{c}</li>
                  ))}
                </ul>
              ) : null}
              {b.drill?.kid_friendly ? (
                <details className="mt-3 rounded-md border border-brand-100 bg-brand-50/60 p-3 text-sm text-slate-800 open:bg-brand-50">
                  <summary className="cursor-pointer font-medium text-brand-700">
                    How to explain it to the kids
                  </summary>
                  <dl className="mt-2 space-y-2 leading-snug">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                        Say this
                      </dt>
                      <dd className="text-slate-800">{b.drill.kid_friendly.explain}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                        What good looks like
                      </dt>
                      <dd className="text-slate-800">{b.drill.kid_friendly.goal}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                        Why it matters
                      </dt>
                      <dd className="text-slate-800">{b.drill.kid_friendly.why}</dd>
                    </div>
                  </dl>
                </details>
              ) : null}
              {b.notes?.length ? (
                <p className="mt-2 text-xs italic text-slate-500">{b.notes.join(" · ")}</p>
              ) : null}
              {b.drill?.safety_flags?.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {b.drill.safety_flags.map((f) => (
                    <span key={f} className="badge-warn text-[10px] uppercase">
                      {f.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              ) : null}
            </Card>
          </li>
        );
      })}
    </ol>
  );
}

export function PlanView({ plan }: { plan: PlanSummary }) {
  return (
    <div className="space-y-6">
      <PlanHeader plan={plan} />
      <PlanWarnings plan={plan} />
      <PlanTimeline blocks={plan.blocks} />
    </div>
  );
}
