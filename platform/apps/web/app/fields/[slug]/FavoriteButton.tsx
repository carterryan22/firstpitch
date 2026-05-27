"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function FavoriteButton({
  fieldId,
  initial,
  signedIn,
}: {
  fieldId: string;
  initial: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);

  if (!signedIn) {
    return (
      <Link href="/login?next=/favorites" className="btn-ghost no-underline hover:no-underline">
        ☆ Save
      </Link>
    );
  }

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "field", targetId: fieldId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { favorited: boolean };
        setSaved(data.favorited);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={toggle} disabled={busy} className={saved ? "btn-dark" : "btn-ghost"}>
      {saved ? "★ Saved" : "☆ Save"}
    </button>
  );
}
