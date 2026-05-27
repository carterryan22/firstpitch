import Link from "next/link";

export function StatCard({
  label,
  value,
  tone = "info",
}: {
  label: string;
  value: string | number;
  tone?: "info" | "ok" | "warn" | "danger";
}) {
  const toneCls =
    tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "danger" ? "text-danger" : "text-slate-900";
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${toneCls}`}>{value}</div>
    </div>
  );
}

export function Badge({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "ok" | "warn" | "danger";
}) {
  const cls =
    tone === "ok" ? "badge-ok" : tone === "warn" ? "badge-warn" : tone === "danger" ? "badge-danger" : "badge-info";
  return <span className={cls}>{children}</span>;
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function ProgressBar({ pct, tone = "info" }: { pct: number; tone?: "info" | "ok" | "warn" | "danger" }) {
  const bg =
    tone === "ok"
      ? "bg-ok"
      : tone === "warn"
      ? "bg-warn"
      : tone === "danger"
      ? "bg-danger"
      : "bg-brand-700";
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full ${bg} transition-all`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

// ---------- Marketing / product surfaces ----------

export function Wordmark({ size = "sm", dark = false }: { size?: "sm" | "lg"; dark?: boolean }) {
  const wrap = size === "lg" ? "text-3xl" : "text-lg";
  const ink = dark ? "text-cream" : "text-ink";
  const accent = dark ? "text-field-400" : "text-field-700";
  return (
    <span className={`wordmark inline-flex items-center gap-2 ${wrap} ${ink}`}>
      <span
        aria-hidden
        className={`inline-flex h-6 w-6 items-center justify-center border-2 ${dark ? "border-cream" : "border-ink"} text-[12px]`}
      >⚾</span>
      <span>
        <span>First</span>
        <span className={accent}> Pitch</span>
      </span>
    </span>
  );
}

export function Hero({
  eyebrow,
  title,
  description,
  primary,
  secondary,
  stats,
  ticker,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  stats?: Array<{ value: string | number; label: string }>;
  ticker?: string;
}) {
  return (
    <section className="overflow-hidden border-2 border-ink bg-chalk p-8 shadow-card md:p-12">
      <div className="max-w-3xl">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="mt-4 text-5xl leading-[1.02] md:text-6xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink/80">{description}</p>
        {stats && stats.length > 0 ? (
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
            {stats.map((s) => (
              <div key={s.label} className="flex items-baseline gap-2">
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-3xl text-ink" style={{ fontFamily: "var(--font-display)" }}>{s.value}</dd>
                <span className="text-[11px] uppercase tracking-[0.18em] text-dirt-300" style={{ fontFamily: "var(--font-type)" }}>{s.label}</span>
              </div>
            ))}
          </dl>
        ) : null}
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={primary.href} className="btn-primary no-underline hover:no-underline">
            ⚾ {primary.label} →
          </Link>
          {secondary ? (
            <Link href={secondary.href} className="btn-ghost no-underline hover:no-underline">
              {secondary.label}
            </Link>
          ) : null}
        </div>
        {ticker ? (
          <div className="mt-7">
            <span className="ticker">⚾ {ticker} ⚾</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function FeatureGrid({
  items,
}: {
  items: Array<{ title: string; description: string; icon?: React.ReactNode }>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((it) => (
        <div key={it.title} className="card">
          {it.icon ? <div className="text-field-700">{it.icon}</div> : null}
          <h3 className="mt-2">{it.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink/75">{it.description}</p>
        </div>
      ))}
    </div>
  );
}

export function RoleTile({
  href,
  title,
  description,
  cta,
}: {
  href: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group block border-2 border-dirt-700 bg-chalk p-6 no-underline shadow-card transition hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard hover:no-underline"
    >
      <h3 className="group-hover:text-field-700">{title}</h3>
      <p className="mt-2 text-sm text-ink/75">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-field-700" style={{ fontFamily: "var(--font-type)" }}>
        {cta} <span aria-hidden>→</span>
      </span>
    </Link>
  );
}

export type EnforcementTone = "hard_block" | "warn_and_label" | "informational";

export function EnforcementBadge({ kind }: { kind: EnforcementTone }) {
  if (kind === "hard_block") return <Badge tone="danger">Hard block</Badge>;
  if (kind === "warn_and_label") return <Badge tone="warn">Warn &amp; label</Badge>;
  return <Badge tone="info">Informational</Badge>;
}

