import type { LoadPassport } from "@platform/safety";
import { LOAD_FLAG_LABEL, LOAD_STATUS_LABEL, loadStatusBadgeClass } from "@platform/safety";

const DOT: Record<LoadPassport["status"], string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-rose-500",
};

function shortDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Presentational Pitch Load Passport card built on the existing
 * `@platform/safety` `buildLoadPassport` output. Families see the calm
 * parent-safe summary; coaches additionally see the underlying flags.
 */
export function LoadStatusCard({
  passport,
  audience = "family",
}: {
  passport: LoadPassport;
  audience?: "coach" | "family";
}) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 ${loadStatusBadgeClass(passport.status)}`}>
          <span className={`h-2 w-2 rounded-full ${DOT[passport.status]}`} aria-hidden />
          {LOAD_STATUS_LABEL[passport.status]}
        </span>
        <span className="text-sm text-slate-700">
          {audience === "family" ? passport.parentSummary : passport.headline}
        </span>
      </div>

      {audience === "coach" && passport.flags.length > 0 ? (
        <ul className="mt-2 space-y-0.5 text-xs">
          {passport.flags.map((f, i) => (
            <li key={i} className={f.severity === "block" ? "text-rose-600" : "text-amber-700"}>
              <span className="font-semibold">{LOAD_FLAG_LABEL[f.code]}:</span> {f.message}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>
          Next safe to pitch:{" "}
          <strong className="text-slate-700">
            {passport.nextEligibleInDays === 0 ? "today" : shortDay(passport.nextEligiblePitchDate)}
          </strong>
        </span>
        <span>
          7-day load: <strong className="text-slate-700 tabular-nums">{passport.rollingWeekLoad}</strong>
        </span>
      </div>
    </div>
  );
}
