"use client";
import { useState } from "react";

interface Props {
  gameId: string;
  initialEnabled: boolean;
  initialPath: string | null;
}

export function PressBoxShare({ gameId, initialEnabled, initialPath }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [path, setPath] = useState<string | null>(initialPath);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/games/${gameId}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const data = (await res.json()) as { shareEnabled: boolean; path: string | null };
      setEnabled(data.shareEnabled);
      setPath(data.path);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const fullUrl = path && typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  async function copy() {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="m-0 text-base">Press Box (parent share)</h3>
          <p className="mt-1 text-xs text-dirt-700">
            One link. No accounts. Parents see roster, lineup after first pitch, pitch counts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggle(!enabled)}
          disabled={busy}
          className={enabled ? "btn-ghost" : "btn-primary"}
        >
          {busy ? "…" : enabled ? "Turn off" : "Turn on"}
        </button>
      </div>
      {enabled && fullUrl ? (
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 truncate border border-dirt-300 bg-cream px-2 py-1 text-xs">
            {fullUrl}
          </code>
          <button type="button" onClick={copy} className="btn-ghost">
            {copied ? "Copied!" : "Copy"}
          </button>
          <a href={path!} className="btn-ghost no-underline hover:no-underline" target="_blank" rel="noreferrer">
            Open
          </a>
        </div>
      ) : null}
      {err ? <p className="text-xs text-red-700">{err}</p> : null}
    </div>
  );
}
