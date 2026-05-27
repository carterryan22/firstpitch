import { NextRequest, NextResponse } from "next/server";
import { getRepos, type MetricEntryAttachment } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_KINDS: MetricEntryAttachment["kind"][] = ["video", "image", "doc", "link"];

function isHttpsUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

async function authForEntry(entryId: string, userId: string) {
  const repos = getRepos();
  const entry = await repos.metricEntries.byId(entryId);
  if (!entry) return { error: "entry not found" as const, status: 404 };
  const player = await repos.players.byId(entry.playerId);
  if (!player?.teamId) return { error: "player has no team" as const, status: 400 };
  if (!(await userCanManageTeam(userId, player.teamId))) {
    return { error: "forbidden" as const, status: 403 };
  }
  return { entry, repos };
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const auth = await authForEntry(id, session.user.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json()) as { url?: string; kind?: string; label?: string };
  if (!body.url || !isHttpsUrl(body.url)) {
    return NextResponse.json({ error: "valid http(s) url required" }, { status: 400 });
  }
  const kind = (ALLOWED_KINDS as string[]).includes(body.kind ?? "")
    ? (body.kind as MetricEntryAttachment["kind"])
    : "link";

  const attachment: MetricEntryAttachment = {
    url: body.url,
    kind,
    label: body.label?.trim() || undefined,
    addedAt: new Date().toISOString(),
    addedByUserId: session.user.id,
  };
  const next = [...(auth.entry.attachments ?? []), attachment];
  const verificationState = auth.entry.verificationState === "self_entered" ? "video_attached" : auth.entry.verificationState;
  const updated = await auth.repos.metricEntries.update(id, {
    attachments: next,
    verificationState,
  });

  await auth.repos.audit.log({
    userId: session.user.id,
    action: "metric_attachment_added",
    resource: `metricEntry:${id}`,
    metadata: { kind, label: attachment.label },
  });
  return NextResponse.json({ entry: updated });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const auth = await authForEntry(id, session.user.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const idx = Number(new URL(req.url).searchParams.get("index") ?? "-1");
  const list = auth.entry.attachments ?? [];
  if (!Number.isFinite(idx) || idx < 0 || idx >= list.length) {
    return NextResponse.json({ error: "invalid index" }, { status: 400 });
  }
  const next = list.slice();
  next.splice(idx, 1);
  const updated = await auth.repos.metricEntries.update(id, { attachments: next });
  await auth.repos.audit.log({
    userId: session.user.id,
    action: "metric_attachment_removed",
    resource: `metricEntry:${id}`,
    metadata: { index: idx },
  });
  return NextResponse.json({ entry: updated });
}
