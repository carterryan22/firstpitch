import { NextResponse } from "next/server";
import { getFieldsRepos } from "../../../../lib/fields";
import { getSession } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Purpose = "practice" | "game" | "scrimmage" | "clinic" | "other";

interface BookBody {
  requestedByName?: string;
  date?: string;
  startTime?: string;
  durationMin?: number;
  purpose?: Purpose;
  notes?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { slug } = await params;
  const repos = await getFieldsRepos();
  const field = await repos.fields.bySlug(slug);
  if (!field) return NextResponse.json({ error: "Field not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as BookBody;
  if (!body.date || !ISO_DATE.test(body.date)) return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  if (!body.startTime || !TIME.test(body.startTime)) return NextResponse.json({ error: "Invalid time." }, { status: 400 });
  const durationMin = Number(body.durationMin);
  if (!Number.isFinite(durationMin) || durationMin < 30 || durationMin > 480) {
    return NextResponse.json({ error: "Duration must be 30-480 min." }, { status: 400 });
  }
  const purpose: Purpose = (["practice", "game", "scrimmage", "clinic", "other"] as Purpose[]).includes(
    body.purpose as Purpose,
  )
    ? (body.purpose as Purpose)
    : "practice";

  const created = await repos.fieldBookings.create({
    fieldId: field.id,
    requestedByUserId: session.user.id,
    requestedByName: (body.requestedByName ?? session.user.name ?? session.user.email).slice(0, 60),
    date: body.date,
    startTime: body.startTime,
    durationMin,
    purpose,
    notes: body.notes?.slice(0, 1000),
  });
  await repos.audit
    .log({ userId: session.user.id, action: "field.booking.create", resource: field.id })
    .catch(() => undefined);
  return NextResponse.json({ booking: created }, { status: 201 });
}
