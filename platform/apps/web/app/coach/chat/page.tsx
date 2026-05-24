"use client";

import { useState } from "react";

interface ChatResponse {
  text: string;
  blocked: boolean;
  escalate: boolean;
  actions: string[];
  providerName: string;
  sources: Array<{ id: string; title: string; tier?: number }>;
}

export default function CoachChatPage() {
  const [message, setMessage] = useState("What's the daily pitch max for 11-12?");
  const [ageBand, setAgeBand] = useState("9-12");
  const [promptId, setPromptId] = useState<"COACH_QA" | "PRACTICE_PLAN">("COACH_QA");
  const [resp, setResp] = useState<ChatResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setResp(null);
    const r = await fetch("/api/coach-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, ageBand, promptId }),
    });
    setBusy(false);
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? `HTTP ${r.status}`);
      return;
    }
    setResp((await r.json()) as ChatResponse);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1>Coach chat</h1>
        <p className="mt-2 text-slate-600">
          Talk to the AI coach. Every reply is rule-checked: forbidden language is stripped,
          pain mentions escalate, and pitch-count violations are blocked before delivery.
        </p>
      </header>

      <form onSubmit={onSubmit} className="card space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="ageBand">Age band</label>
            <select id="ageBand" className="input" value={ageBand} onChange={(e) => setAgeBand(e.target.value)}>
              <option value="6-8">6-8</option>
              <option value="9-12">9-12</option>
              <option value="13-15">13-15</option>
              <option value="16+">16+</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="promptId">Prompt</label>
            <select
              id="promptId"
              className="input"
              value={promptId}
              onChange={(e) => setPromptId(e.target.value as "COACH_QA" | "PRACTICE_PLAN")}
            >
              <option value="COACH_QA">Coach Q&amp;A</option>
              <option value="PRACTICE_PLAN">Practice plan draft</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="message">Message</label>
          <textarea
            id="message"
            className="input min-h-[80px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Asking…" : "Ask"}
        </button>
      </form>

      {err && (
        <div className="card border-danger/30 bg-danger-soft/40 text-sm text-danger">
          {err === "Authentication required" || err === "Forbidden"
            ? `${err}. You need to be signed in as a coach.`
            : err}
        </div>
      )}

      {resp && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="badge-info">provider: {resp.providerName}</span>
            {resp.blocked && <span className="badge-danger">post-filter blocked</span>}
            {resp.escalate && <span className="badge-warn">escalate</span>}
            {!resp.blocked && !resp.escalate && <span className="badge-ok">clean</span>}
          </div>
          <pre className="whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm text-slate-800">{resp.text}</pre>
          {resp.actions.length > 0 && (
            <div className="text-xs text-slate-600">
              <strong>actions:</strong>
              <ul className="list-disc pl-5">
                {resp.actions.map((a, i) => <li key={i}><code>{a}</code></li>)}
              </ul>
            </div>
          )}
          {resp.sources.length > 0 && (
            <div className="text-xs text-slate-600">
              <strong>sources:</strong>
              <ul className="list-disc pl-5">
                {resp.sources.map((s) => (
                  <li key={s.id}>
                    {s.title}
                    {s.tier !== undefined ? <span className="badge-info ml-2">Tier {s.tier}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
