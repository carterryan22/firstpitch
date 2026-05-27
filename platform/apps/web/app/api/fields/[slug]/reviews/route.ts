import { NextResponse } from "next/server";
import { getFieldsRepos } from "../../../../lib/fields";
import { getSession } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Role = "parent" | "coach" | "player" | "umpire" | "other";

interface ReviewBody {
  authorName?: string;
  authorRole?: Role;
  rating?: number;
  body?: string;
}

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

  const body = (await req.json().catch(() => ({}))) as ReviewBody;
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1-5." }, { status: 400 });
  }
  const text = (body.body ?? "").trim();
  if (text.length < 10) {
    return NextResponse.json({ error: "Tell us a bit more (10+ characters)." }, { status: 400 });
  }
  const role: Role = (["parent", "coach", "player", "umpire", "other"] as Role[]).includes(
    body.authorRole as Role,
  )
    ? (body.authorRole as Role)
    : "other";
  const authorName = (body.authorName ?? session.user.name ?? session.user.email).trim().slice(0, 60) || "Anonymous";

  const created = await repos.fieldReviews.create({
    fieldId: field.id,
    authorUserId: session.user.id,
    authorName,
    authorRole: role,
    rating: rating as 1 | 2 | 3 | 4 | 5,
    body: text.slice(0, 4000),
  });
  await repos.audit.log({
    userId: session.user.id,
    action: "field.review.create",
    resource: field.id,
  });
  return NextResponse.json({ review: created }, { status: 201 });
}
