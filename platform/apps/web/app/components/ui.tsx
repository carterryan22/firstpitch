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

export function Wordmark({ size = "sm" }: { size?: "sm" | "lg" }) {
  const wrap = size === "lg" ? "text-2xl" : "text-base";
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight text-slate-900 ${wrap}`}>
      <span
        aria-hidden
        className="inline-block h-5 w-5 rounded-full bg-gradient-to-br from-brand-500 to-brand-900 ring-2 ring-white"
      />
      <span>
        <span className="text-slate-900">First </span>
        <span className="text-brand-700">Pitch</span>
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
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-card md:p-12">
      <div className="max-w-2xl">
        <span className="badge-info uppercase tracking-wider">{eyebrow}</span>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-lg text-slate-600">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={primary.href} className="btn-primary no-underline hover:no-underline">
            {primary.label}
          </Link>
          {secondary ? (
            <Link href={secondary.href} className="btn-ghost no-underline hover:no-underline">
              {secondary.label}
            </Link>
          ) : null}
        </div>
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
          {it.icon ? <div className="text-brand-700">{it.icon}</div> : null}
          <h3 className="mt-2 text-slate-900">{it.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{it.description}</p>
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
      className="group block rounded-xl border border-slate-200 bg-white p-6 no-underline shadow-card transition hover:border-brand-500/60 hover:shadow-md hover:no-underline"
    >
      <h3 className="text-slate-900 group-hover:text-brand-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
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

