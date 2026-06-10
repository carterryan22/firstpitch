"use client";

import { useState } from "react";
import { share, hapticTap } from "../../../../lib/native";

interface DigestPayload {
  teamName: string;
  windowStart: string;
  windowEnd: string;
  upcomingGames: Array<{ opponent: string; homeAway: "home" | "away"; startsAt: string }>;
  upcomingPractices: Array<{ name: string; scheduledAt: string }>;
  pitcherReturns: Array<{ name: string; availableOn: string }>;
  goalsAchievedThisWeek: Array<{ name: string; metricKey: string }>;
  goalsAtRisk: Array<{ name: string; metricKey: string }>;
}

function buildText(d: DigestPayload): string {
  const lines: string[] = [];
  lines.push(`${d.teamName}: weekly digest`);
  lines.push(
    `${new Date(d.windowStart).toLocaleDateString()} → ${new Date(d.windowEnd).toLocaleDateString()}`,
  );
  if (d.upcomingGames.length) {
    lines.push("");
    lines.push("Games:");
    for (const g of d.upcomingGames) {
      lines.push(`  ${g.homeAway === "home" ? "vs" : "@"} ${g.opponent}: ${new Date(g.startsAt).toLocaleString()}`);
    }
  }
  if (d.upcomingPractices.length) {
    lines.push("");
    lines.push("Practices:");
    for (const p of d.upcomingPractices) {
      lines.push(`  ${p.name}: ${new Date(p.scheduledAt).toLocaleString()}`);
    }
  }
  if (d.pitcherReturns.length) {
    lines.push("");
    lines.push("Pitchers returning:");
    for (const p of d.pitcherReturns) lines.push(`  ${p.name}: ${p.availableOn}`);
  }
  if (d.goalsAchievedThisWeek.length) {
    lines.push("");
    lines.push("Goals achieved:");
    for (const g of d.goalsAchievedThisWeek) lines.push(`  ✓ ${g.name} (${g.metricKey})`);
  }
  if (d.goalsAtRisk.length) {
    lines.push("");
    lines.push("Goals at risk:");
    for (const g of d.goalsAtRisk) lines.push(`  ⚠ ${g.name} (${g.metricKey})`);
  }
  return lines.join("\n");
}

export function ShareDigestButton({ digest, url }: { digest: DigestPayload; url: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function onClick() {
    void hapticTap();
    const result = await share({
      title: `${digest.teamName}: weekly digest`,
      text: buildText(digest),
      url,
    });
    if (result === "clipboard") setStatus("Copied to clipboard");
    else if (result === "noop") setStatus("Sharing not available in this browser");
    else setStatus(null);
    if (result !== "noop") window.setTimeout(() => setStatus(null), 2500);
  }

  return (
    <div className="flex items-center gap-3">
      <button type="button" className="btn-ghost text-xs" onClick={onClick}>
        Share digest
      </button>
      {status ? <span className="text-xs text-dirt-700">{status}</span> : null}
    </div>
  );
}
