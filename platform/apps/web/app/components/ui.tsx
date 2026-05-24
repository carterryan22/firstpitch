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
