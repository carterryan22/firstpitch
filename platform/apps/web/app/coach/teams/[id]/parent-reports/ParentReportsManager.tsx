"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ParentReportContent } from "@platform/storage";

export interface ReportVM {
  id: string;
  playerId: string;
  playerName: string;
  periodStart: string;
  periodLabel: string;
  status: "draft" | "approved" | "shared";
  editedSinceApproval: boolean;
  sharedVia: Array<"dashboard" | "email">;
  content: ParentReportContent;
}

export interface PeriodVM {
  periodStart: string;
  label: string;
  reports: ReportVM[];
}

interface Props {
  teamId: string;
  rosterCount: number;
  nextPeriodLabel: string;
  nextPeriodStart: string;
  periods: PeriodVM[];
}

type FieldKey = keyof ParentReportContent;

const FIELD_META: Array<{ key: FieldKey; label: string; multiline?: boolean; optional?: boolean }> = [
  { key: "summary", label: "Summary" },
  { key: "attendance", label: "Attendance" },
  { key: "effort", label: "Effort" },
  { key: "improvement", label: "Improvement", optional: true },
  { key: "playingTime", label: "Playing time" },
  { key: "focus", label: "This month's focus", multiline: true },
  { key: "homeMission", label: "Home mission", multiline: true },
  { key: "safetyNote", label: "Arm-care / rest note", optional: true, multiline: true },
  { key: "coachNote", label: "Coach note (required to share)", multiline: true },
];

function statusChip(r: ReportVM): { label: string; cls: string } {
  if (r.status === "shared") return { label: "Shared", cls: "badge-ok" };
  if (r.status === "approved") {
    return r.editedSinceApproval
      ? { label: "Edited, re-approve", cls: "badge-warn" }
      : { label: "Approved", cls: "badge-info" };
  }
  return { label: "Draft", cls: "badge-warn" };
}

function canShare(r: ReportVM): boolean {
  return r.status === "approved" && !r.editedSinceApproval && r.content.coachNote.trim().length > 0;
}

export function ParentReportsManager({
  teamId,
  rosterCount,
  nextPeriodLabel,
  nextPeriodStart,
  periods,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<ParentReportContent | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function flash(msg: string) {
    setMessage(msg);
    setError(null);
    setTimeout(() => setMessage(null), 4000);
  }
  function fail(msg: string) {
    setError(msg);
    setMessage(null);
  }

  async function call(url: string, init?: RequestInit): Promise<Response> {
    return fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      ...init,
    });
  }

  async function generate() {
    setBusy("generate");
    setError(null);
    try {
      const res = await call(`/api/teams/${teamId}/parent-reports`, {
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        fail("Couldn't generate drafts. Try again.");
        return;
      }
      const created = Array.isArray(data.created) ? data.created.length : 0;
      const skipped = Array.isArray(data.skipped) ? data.skipped.length : 0;
      flash(`Generated ${created} draft${created === 1 ? "" : "s"}${skipped ? `, ${skipped} already existed` : ""}.`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  function startEdit(r: ReportVM) {
    setEditing(r.id);
    setDraft({ ...r.content });
    setError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setDraft(null);
  }

  async function saveEdit(r: ReportVM) {
    if (!draft) return;
    if (draft.coachNote.trim().length === 0) {
      fail("Add a coach note before saving. It's required to share.");
      return;
    }
    setBusy(`edit:${r.id}`);
    try {
      const res = await fetch(`/api/parent-reports/${r.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        fail(data.error === "recall_first" ? "Recall the shared report before editing." : "Couldn't save edits.");
        return;
      }
      flash(r.status === "approved" ? "Saved. Needs re-approval before sharing." : "Saved.");
      cancelEdit();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function approve(r: ReportVM) {
    setBusy(`approve:${r.id}`);
    try {
      const res = await call(`/api/parent-reports/${r.id}/approve`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        fail(data.error === "coach_note_required" ? "Add a coach note first." : "Couldn't approve.");
        return;
      }
      flash("Approved. Review once more, then share when ready.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function share(r: ReportVM, withEmail: boolean) {
    setBusy(`share:${r.id}`);
    try {
      const res = await call(`/api/parent-reports/${r.id}/share`, {
        body: JSON.stringify({ via: withEmail ? ["dashboard", "email"] : ["dashboard"] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const map: Record<string, string> = {
          not_approved: "Approve the report before sharing.",
          needs_reapproval: "It changed since approval. Re-approve first.",
          coach_note_required: "Add a coach note first.",
        };
        fail(map[data.error as string] ?? "Couldn't share.");
        return;
      }
      flash("Shared with the family.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function recall(r: ReportVM) {
    setBusy(`recall:${r.id}`);
    try {
      const res = await call(`/api/parent-reports/${r.id}/recall`);
      if (!res.ok) {
        fail("Couldn't recall.");
        return;
      }
      flash("Recalled. Hidden from the family until you re-share.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function approveAll(period: PeriodVM) {
    const targets = period.reports.filter(
      (r) => r.status === "draft" && r.content.coachNote.trim().length > 0,
    );
    if (targets.length === 0) {
      flash("No drafts ready to approve.");
      return;
    }
    setBusy(`approveAll:${period.periodStart}`);
    try {
      for (const r of targets) {
        await call(`/api/parent-reports/${r.id}/approve`);
      }
      flash(`Approved ${targets.length} report${targets.length === 1 ? "" : "s"}.`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function shareAll(period: PeriodVM) {
    const targets = period.reports.filter(canShare);
    if (targets.length === 0) {
      flash("No approved reports ready to share.");
      return;
    }
    setBusy(`shareAll:${period.periodStart}`);
    try {
      for (const r of targets) {
        await call(`/api/parent-reports/${r.id}/share`, { body: JSON.stringify({ via: ["dashboard"] }) });
      }
      flash(`Shared ${targets.length} report${targets.length === 1 ? "" : "s"}.`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg">Draft {nextPeriodLabel}</h2>
            <p className="text-sm text-ink/60">
              Builds a private draft for each of your {rosterCount} player{rosterCount === 1 ? "" : "s"}. Existing drafts are left untouched.
            </p>
          </div>
          <button className="btn-primary min-h-[44px]" onClick={generate} disabled={busy === "generate"}>
            {busy === "generate" ? "Generating…" : `Generate ${nextPeriodLabel} drafts`}
          </button>
        </div>
      </div>

      {message && (
        <p className="rounded border-2 border-field-700 bg-field-700/10 px-3 py-2 text-sm" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded border-2 border-danger bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {periods.length === 0 && (
        <div className="card text-ink/70">
          No reports yet. Generate this period's drafts above, then review and approve each one before sharing.
        </div>
      )}

      {periods.map((period) => {
        const counts = {
          draft: period.reports.filter((r) => r.status === "draft").length,
          approved: period.reports.filter((r) => r.status === "approved").length,
          shared: period.reports.filter((r) => r.status === "shared").length,
        };
        const pBusy = busy === `approveAll:${period.periodStart}` || busy === `shareAll:${period.periodStart}`;
        return (
          <section key={period.periodStart} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-dirt-300 pb-2">
              <h2 className="text-lg">{period.label}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="badge-warn badge">{counts.draft} draft</span>
                <span className="badge-info badge">{counts.approved} approved</span>
                <span className="badge-ok badge">{counts.shared} shared</span>
                <button
                  className="btn-ghost min-h-[36px]"
                  onClick={() => approveAll(period)}
                  disabled={pBusy}
                >
                  Approve all drafts
                </button>
                <button
                  className="btn-ghost min-h-[36px]"
                  onClick={() => shareAll(period)}
                  disabled={pBusy}
                >
                  Share all approved
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {period.reports.map((r) => {
                const chip = statusChip(r);
                const isEditing = editing === r.id;
                const rowBusy = busy?.endsWith(`:${r.id}`) ?? false;
                return (
                  <div key={r.id} className="card space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{r.playerName}</span>
                        <span className={`badge ${chip.cls}`}>{chip.label}</span>
                        {r.status === "shared" && r.sharedVia.includes("email") && (
                          <span className="badge badge-info">emailed</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {!isEditing && r.status !== "shared" && (
                          <button className="btn-ghost min-h-[36px]" onClick={() => startEdit(r)} disabled={rowBusy}>
                            Edit
                          </button>
                        )}
                        {!isEditing && r.status === "draft" && (
                          <button
                            className="btn-primary min-h-[36px]"
                            onClick={() => approve(r)}
                            disabled={rowBusy || r.content.coachNote.trim().length === 0}
                            title={r.content.coachNote.trim().length === 0 ? "Add a coach note first" : undefined}
                          >
                            Approve
                          </button>
                        )}
                        {!isEditing && r.status === "approved" && (
                          <>
                            <button
                              className="btn-primary min-h-[36px]"
                              onClick={() => share(r, false)}
                              disabled={rowBusy || !canShare(r)}
                            >
                              Share
                            </button>
                            <button
                              className="btn-ghost min-h-[36px]"
                              onClick={() => share(r, true)}
                              disabled={rowBusy || !canShare(r)}
                              title="Publish to the family dashboard and email the parent"
                            >
                              Share + email
                            </button>
                          </>
                        )}
                        {!isEditing && r.status === "shared" && (
                          <button className="btn-ghost min-h-[36px]" onClick={() => recall(r)} disabled={rowBusy}>
                            Recall
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing && draft ? (
                      <div className="space-y-3">
                        {FIELD_META.map((f) => (
                          <div key={f.key}>
                            <label className="label">
                              {f.label}
                              {f.optional && <span className="text-ink/50"> · optional</span>}
                            </label>
                            {f.multiline ? (
                              <textarea
                                className="input min-h-[64px]"
                                value={draft[f.key] ?? ""}
                                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                              />
                            ) : (
                              <input
                                className="input"
                                value={draft[f.key] ?? ""}
                                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                              />
                            )}
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <button className="btn-primary min-h-[40px]" onClick={() => saveEdit(r)} disabled={rowBusy}>
                            Save
                          </button>
                          <button className="btn-ghost min-h-[40px]" onClick={cancelEdit} disabled={rowBusy}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <ParentPreview content={r.content} />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ParentPreview({ content }: { content: ParentReportContent }) {
  return (
    <div className="rounded border-2 border-dirt-300 bg-cream/60 p-3 text-sm">
      <p className="mb-1 text-xs uppercase tracking-wide text-ink/50">What the family sees</p>
      <p className="font-semibold">{content.summary}</p>
      <ul className="mt-2 space-y-1">
        <li><strong>Attendance:</strong> {content.attendance}</li>
        <li><strong>Effort:</strong> {content.effort}</li>
        {content.improvement && <li><strong>Improvement:</strong> {content.improvement}</li>}
        <li><strong>Playing time:</strong> {content.playingTime}</li>
        <li><strong>Focus:</strong> {content.focus}</li>
        <li><strong>Home mission:</strong> {content.homeMission}</li>
        {content.safetyNote && <li><strong>Arm care:</strong> {content.safetyNote}</li>}
        <li className="pt-1 italic">"{content.coachNote}"</li>
      </ul>
    </div>
  );
}
