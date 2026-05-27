import { NextResponse } from "next/server";
import { getRepos } from "@platform/storage";

export const dynamic = "force-dynamic";

function icsDate(iso: string): string {
  // YYYYMMDDTHHMMSSZ
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.getUTCFullYear().toString().padStart(4, "0") +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0") +
    "T" +
    String(d.getUTCHours()).padStart(2, "0") +
    String(d.getUTCMinutes()).padStart(2, "0") +
    String(d.getUTCSeconds()).padStart(2, "0") +
    "Z"
  );
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repos = getRepos();
  const team = await repos.teams.byId(id);
  if (!team) return new NextResponse("Not found", { status: 404 });
  const games = await repos.games.list({ teamId: id });

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Player Development Platform//Games//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeText(team.name)} schedule`,
  ];
  for (const g of games) {
    const start = icsDate(g.startsAt);
    if (!start) continue;
    const endDate = new Date(g.startsAt);
    endDate.setUTCHours(endDate.getUTCHours() + 2);
    const end = icsDate(endDate.toISOString());
    const summary = `${g.homeAway === "home" ? "vs" : "@"} ${g.opponent}`;
    const desc = [
      `${g.innings} innings`,
      g.notes ? `Notes: ${g.notes}` : null,
      g.status ? `Status: ${g.status}` : null,
    ]
      .filter(Boolean)
      .join("\\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${g.id}@player-development-platform`,
      `DTSTAMP:${icsDate(g.createdAt ?? g.startsAt) || start}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeText(summary)}`,
      ...(g.venue ? [`LOCATION:${escapeText(g.venue)}`] : []),
      `DESCRIPTION:${escapeText(desc)}`,
      "END:VEVENT",
    );
  }

  const plans = await repos.plans.list({ teamId: id, scheduled: true });
  for (const p of plans) {
    if (!p.scheduledAt) continue;
    const start = icsDate(p.scheduledAt);
    if (!start) continue;
    const endDate = new Date(p.scheduledAt);
    endDate.setUTCMinutes(endDate.getUTCMinutes() + p.durationMin);
    const end = icsDate(endDate.toISOString());
    const desc = [
      `${p.durationMin} min practice`,
      p.focus?.length ? `Focus: ${p.focus.join(", ")}` : null,
      p.notes ? `Notes: ${p.notes}` : null,
    ]
      .filter(Boolean)
      .join("\\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:practice-${p.id}@player-development-platform`,
      `DTSTAMP:${icsDate(p.createdAt) || start}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeText(`Practice — ${p.name}`)}`,
      ...(p.location ? [`LOCATION:${escapeText(p.location)}`] : []),
      `DESCRIPTION:${escapeText(desc)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
