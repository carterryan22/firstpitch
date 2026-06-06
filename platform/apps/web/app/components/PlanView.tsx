import { Badge, Card } from "./ui";
import { PrintButton } from "./PrintButton";
import { AssignSuggestedButton } from "./AssignSuggestedButton";
import { missingGearForEquipment, affiliateUrl } from "@platform/gear";

// Mirrors @platform/compiler CompiledBlock without importing it (avoids server/client coupling).
export interface PlanBlock {
  blockId: string;
  type: "warmup" | "skill" | "rest" | "game" | "cooldown" | "transition";
  durationMin: number;
  drill: {
    drill_id: string;
    name: string;
    short_description: string;
    coaching_cues: string[];
    safety_flags?: string[];
    throw_count_contribution?: number;
    intensity?: string;
    equipment_required?: string[];
    topic?: string;
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
  theme?: string;
  talkingPoints?: string[];
  antiLine?: {
    ok: boolean;
    flaggedBlocks: Array<{ blockId: string; ratio: number; suggestedStations: number }>;
  };
  suggestedMissions?: Array<{
    id: string;
    title: string;
    description: string;
    kind: string;
    cadenceDays: number;
    minVerification: string;
    drillId?: string;
  }>;
}

const TYPE_LABEL: Record<PlanBlock["type"], string> = {
  warmup: "Warm-up",
  skill: "Skill block",
  rest: "Water break",
  game: "Game / competition",
  cooldown: "Cool-down",
  transition: "Move stations",
};

const TYPE_TONE: Record<PlanBlock["type"], "info" | "ok" | "warn"> = {
  warmup: "info",
  skill: "ok",
  rest: "warn",
  game: "ok",
  cooldown: "info",
  transition: "info",
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
            {antiLine!.flaggedBlocks.map((f) => {
              const block = plan.blocks.find((b) => b.blockId === f.blockId);
              const label = block?.drill?.name ?? (block ? TYPE_LABEL[block.type] : "Block");
              return (
                <li key={f.blockId}>
                  <strong>{label}</strong> — about {f.ratio} players per station. Split into{" "}
                  <strong>{f.suggestedStations}</strong> stations to keep everyone active.
                </li>
              );
            })}
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

export function PlanView({
  plan,
  teamId,
  planId,
}: {
  plan: PlanSummary;
  teamId?: string;
  planId?: string;
}) {
  return (
    <div className="space-y-6">
      <PlanShareBar plan={plan} />
      <PlanHeader plan={plan} />
      <PlanThemeCard plan={plan} />
      <PlanSafetySummary plan={plan} />
      <PlanWarnings plan={plan} />
      <SuggestedMissions plan={plan} teamId={teamId} planId={planId} />
      <PlanEquipment blocks={plan.blocks} />
      <PlanTimeline blocks={plan.blocks} />
      <ParentVersion plan={plan} />
    </div>
  );
}

function PlanShareBar({ plan }: { plan: PlanSummary }) {
  const blocked = plan.blocked?.length ?? 0;
  const safetyOk = blocked === 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-ink bg-cream/60 p-3 print:hidden">
      <div className="flex items-center gap-2 text-sm">
        {safetyOk ? (
          <Badge tone="ok">Safety check passed</Badge>
        ) : (
          <Badge tone="danger">Safety blocked {blocked} item{blocked === 1 ? "" : "s"}</Badge>
        )}
        <span className="text-ink/70">{plan.blocks.length} block{plan.blocks.length === 1 ? "" : "s"} · {plan.durationMin} min</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <PrintButton />
        <a
          href="#parent-version"
          className="btn-ghost text-sm no-underline hover:no-underline"
        >
          👪 Parent / player version
        </a>
      </div>
    </div>
  );
}

function PlanThemeCard({ plan }: { plan: PlanSummary }) {
  const points = plan.talkingPoints ?? [];
  if (!plan.theme && points.length === 0) return null;
  return (
    <Card className="border-brand-700/30 bg-brand-50/60">
      {plan.theme ? (
        <div className="flex items-center gap-2">
          <Badge tone="info">Theme</Badge>
          <span className="font-medium text-brand-700">{plan.theme}</span>
        </div>
      ) : null}
      {points.length > 0 ? (
        <>
          <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-700">
            Huddle talking points
          </h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink/85">
            {points.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </>
      ) : null}
    </Card>
  );
}

function PlanSafetySummary({ plan }: { plan: PlanSummary }) {
  const throwingNote =
    typeof plan.totalThrowingLoad === "number"
      ? plan.totalThrowingLoad > 60
        ? `Throwing load is ${plan.totalThrowingLoad} — above the 60-throw soft cap. Watch arm fatigue and rest days per Pitch Smart.`
        : `Throwing load is ${plan.totalThrowingLoad} — within the soft cap. Pitch Smart rest still applies to any pitchers.`
      : null;
  return (
    <Card className="border-ink/30 bg-cream/40">
      <div className="flex items-center gap-2">
        <Badge tone={(plan.blocked?.length ?? 0) === 0 ? "ok" : "danger"}>
          {(plan.blocked?.length ?? 0) === 0 ? "Cleared by safety corpus" : "Safety blocks applied"}
        </Badge>
        <span className="text-xs text-ink/60">{plan.ageBand} age band</span>
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink/85">
        <li>Plan compiled through the Tier-1 safety corpus (Pitch Smart, NSCA, CDC).</li>
        <li>Each block uses drills filtered by age band, equipment, and environment tier.</li>
        {throwingNote ? <li>{throwingNote}</li> : null}
        {plan.focus && plan.focus.length > 0 ? (
          <li>Focus areas: {plan.focus.join(", ")} — used to pick skill blocks.</li>
        ) : null}
      </ul>
    </Card>
  );
}

function SuggestedMissions({
  plan,
  teamId,
  planId,
}: {
  plan: PlanSummary;
  teamId?: string;
  planId?: string;
}) {
  const ms = plan.suggestedMissions ?? [];
  if (ms.length === 0) return null;
  return (
    <Card className="border-grass/40 bg-grass/10">
      <h3 className="m-0 text-base uppercase">Auto-suggested player missions</h3>
      <p className="mt-1 text-xs text-ink/70">
        Drills in this plan map to existing missions. Assign them so players keep grinding between practices.
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {ms.map((m) => (
          <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-2 border-l-4 border-grass pl-3">
            <div>
              <strong>{m.title}</strong>
              <span className="ml-2 text-xs uppercase tracking-wide text-ink/60">
                · {m.cadenceDays}d · {m.minVerification.replace(/_/g, " ")}
              </span>
              <p className="m-0 mt-0.5 text-xs text-ink/80">{m.description}</p>
            </div>
            {teamId ? (
              <AssignSuggestedButton teamId={teamId} missionId={m.id} planId={planId} />
            ) : (
              <a className="text-xs underline" href={`/missions?focus=${m.id}`}>
                View / assign →
              </a>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function PlanEquipment({ blocks }: { blocks: PlanBlock[] }) {
  const all = new Set<string>();
  for (const b of blocks) {
    for (const e of b.drill?.equipment_required ?? []) all.add(e);
  }
  if (all.size === 0) return null;
  const amazonTag = process.env.NEXT_PUBLIC_AFFILIATE_AMAZON_TAG;
  const gear = missingGearForEquipment(Array.from(all));
  return (
    <Card>
      <h3 className="m-0 text-base uppercase">Equipment to grab</h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {Array.from(all).sort().map((e) => (
          <li key={e} className="badge">{e.replace(/_/g, " ")}</li>
        ))}
      </ul>
      {gear.length > 0 ? (
        <div className="mt-4 border-t border-ink/15 pt-3">
          <p className="m-0 text-xs uppercase tracking-[0.12em] text-dirt-300" style={{ fontFamily: "var(--font-type)" }}>
            Don't have it? Tested picks
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {gear.map((p) => {
              const href = affiliateUrl(p, amazonTag);
              return href ? (
                <li key={p.id}>
                  <a
                    href={href}
                    target="_blank"
                    rel="sponsored nofollow noopener noreferrer"
                    className="btn-ghost no-underline hover:no-underline"
                  >
                    {p.name} · ~${p.price_usd} →
                  </a>
                </li>
              ) : null;
            })}
          </ul>
          <p className="mt-2 text-[11px] italic text-ink/55">
            Affiliate links — small commission, never changes your price. Gear is optional.
          </p>
        </div>
      ) : null}
    </Card>
  );
}

function ParentVersion({ plan }: { plan: PlanSummary }) {
  let cursor = 0;
  return (
    <section id="parent-version" className="mt-8 border-t-2 border-dashed border-ink/30 pt-6">
      <header className="space-y-1">
        <p className="eyebrow">For the parent group chat</p>
        <h2 className="m-0">Tonight&apos;s practice — the short version</h2>
        <p className="quote text-sm">
          Plain-English version you can copy/paste to parents. No coach jargon, no safety tables.
        </p>
      </header>
      <Card className="mt-3 bg-cream/60">
        <p className="m-0 text-sm">
          <strong>{plan.durationMin} minutes</strong> · age band <strong>{plan.ageBand}</strong>
          {plan.focus && plan.focus.length > 0 ? <> · focus: {plan.focus.join(", ")}</> : null}
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
          {plan.blocks.map((b, i) => (
            <li key={b.blockId ?? i}>
              <strong>{b.durationMin} min — {b.drill?.name ?? TYPE_LABEL[b.type]}.</strong>{" "}
              {b.drill?.kid_friendly?.explain ?? b.drill?.short_description ?? "Open block."}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-ink/60">
          Built with the First Pitch safety checker. Pitch counts and rest days follow Pitch Smart.
        </p>
      </Card>
    </section>
  );
}
