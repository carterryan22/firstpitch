"use client";

import { useState } from "react";

type Turn = {
  role: "user" | "assistant";
  text: string;
  blocked?: boolean;
  escalate?: boolean;
  sources?: Array<{ id: string; title: string; tier?: number }>;
  ctx?: { players: number; recentGames: number; activeGoals: number; recentBaselines: number };
};

const SUGGESTIONS = [
  "Who is available to pitch on Saturday given recent outings?",
  "Which players are closest to achieving their active goals?",
  "Draft a 60-minute team practice focused on infield fundamentals.",
  "Which players have not had a baseline recorded in the last 30 days?",
  "Summarize how the team has been performing in the last 5 games.",
];

export function AskPanel({ teamId }: { teamId: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function ask(q: string) {
    const text = q.trim();
    if (!text || busy) return;
    setErr(null);
    setBusy(true);
    setTurns((t) => [...t, { role: "user", text }]);
    setQuestion("");
    const res = await fetch("/api/coach/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ teamId, question: text }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Request failed");
      return;
    }
    const j = (await res.json()) as {
      text: string;
      blocked?: boolean;
      escalate?: boolean;
      sources?: Turn["sources"];
      teamContext?: Turn["ctx"];
    };
    setTurns((t) => [
      ...t,
      {
        role: "assistant",
        text: j.text,
        blocked: j.blocked,
        escalate: j.escalate,
        sources: j.sources,
        ctx: j.teamContext,
      },
    ]);
  }

  return (
    <div className="space-y-4">
      {turns.length === 0 ? (
        <section className="card">
          <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">Try asking</h2>
          <ul className="mt-3 space-y-2">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm hover:border-teal-500 hover:bg-white"
                  onClick={() => ask(s)}
                  disabled={busy}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ol className="space-y-3">
        {turns.map((t, i) => (
          <li key={i} className={t.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                t.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-tr-sm bg-teal-600 px-4 py-2 text-sm text-white"
                  : "max-w-[90%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm"
              }
            >
              {t.blocked ? (
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-600">
                  Blocked by safety filter
                </p>
              ) : null}
              {t.escalate ? (
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
                  Escalation suggested
                </p>
              ) : null}
              <div className="whitespace-pre-wrap">{t.text}</div>
              {t.role === "assistant" && t.sources && t.sources.length > 0 ? (
                <p className="mt-2 text-xs text-slate-500">
                  Sources:{" "}
                  {t.sources.map((s, j) => (
                    <span key={s.id}>
                      {j > 0 ? ", " : ""}
                      <code className="rounded bg-slate-100 px-1">{s.id}</code>
                      {s.tier ? <span className="ml-1 text-[10px]">T{s.tier}</span> : null}
                    </span>
                  ))}
                </p>
              ) : null}
              {t.role === "assistant" && t.ctx ? (
                <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                  context: {t.ctx.players}p · {t.ctx.recentGames}g · {t.ctx.activeGoals}goals ·{" "}
                  {t.ctx.recentBaselines}base
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <form
        className="card flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <label htmlFor="ask" className="label">
          Ask a question
        </label>
        <textarea
          id="ask"
          className="input min-h-[80px]"
          placeholder="e.g. Who should I start at SS tonight given the lineup constraints?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={busy}
        />
        <div className="flex justify-end">
          <button type="submit" className="btn-primary text-sm" disabled={busy || !question.trim()}>
            {busy ? "Thinking…" : "Ask"}
          </button>
        </div>
      </form>
    </div>
  );
}
