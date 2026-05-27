"use client";

import { useState } from "react";
import type { MetricEntryAttachment } from "@platform/storage/types";
import { captureFromCamera, isNative } from "../../../../../lib/native";

const KIND_LABEL: Record<MetricEntryAttachment["kind"], string> = {
  video: "🎥",
  image: "🖼️",
  doc: "📄",
  link: "🔗",
};

export function AttachmentsCell({
  entryId,
  initial,
}: {
  entryId: string;
  initial: MetricEntryAttachment[];
}) {
  const [items, setItems] = useState<MetricEntryAttachment[]>(initial);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<MetricEntryAttachment["kind"]>("video");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/metric-entries/${entryId}/attachments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: url.trim(), kind, label: label.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Failed to add");
      return;
    }
    const j = (await res.json()) as { entry?: { attachments?: MetricEntryAttachment[] } };
    setItems(j.entry?.attachments ?? []);
    setUrl("");
    setLabel("");
    setOpen(false);
  }

  async function remove(idx: number) {
    if (!confirm("Remove this attachment?")) return;
    setBusy(true);
    const res = await fetch(`/api/metric-entries/${entryId}/attachments?index=${idx}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (!res.ok) return;
    const j = (await res.json()) as { entry?: { attachments?: MetricEntryAttachment[] } };
    setItems(j.entry?.attachments ?? []);
  }

  // Native-only quick-capture: opens the iOS / iPadOS camera, uploads the
  // resulting data URL as an `image` attachment. On web this button is
  // hidden — the regular "+ Add" flow already accepts pasted image URLs.
  async function quickCapture() {
    setBusy(true);
    setErr(null);
    const photo = await captureFromCamera();
    if (!photo) {
      setBusy(false);
      setErr("Camera unavailable");
      return;
    }
    const res = await fetch(`/api/metric-entries/${entryId}/attachments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: photo.dataUrl, kind: "image", label: "Camera capture" }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Upload failed");
      return;
    }
    const j = (await res.json()) as { entry?: { attachments?: MetricEntryAttachment[] } };
    setItems(j.entry?.attachments ?? []);
  }

  return (
    <div className="space-y-1">
      {items.length === 0 ? (
        <span className="text-xs text-slate-400">None</span>
      ) : (
        <ul className="space-y-1">
          {items.map((a, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <span>{KIND_LABEL[a.kind]}</span>
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="truncate text-teal-700 underline hover:text-teal-900"
                title={a.url}
              >
                {a.label ?? a.url}
              </a>
              <button
                type="button"
                className="text-[10px] text-slate-400 hover:text-red-600"
                disabled={busy}
                onClick={() => remove(i)}
                aria-label="Remove attachment"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {open ? (
        <form className="mt-2 space-y-1" onSubmit={add}>
          <input
            className="input text-xs"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <div className="flex gap-1">
            <select
              className="input text-xs"
              value={kind}
              onChange={(e) => setKind(e.target.value as MetricEntryAttachment["kind"])}
            >
              <option value="video">Video</option>
              <option value="image">Image</option>
              <option value="doc">Doc</option>
              <option value="link">Link</option>
            </select>
            <input
              className="input text-xs"
              placeholder="Label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          {err ? <p className="text-[10px] text-red-600">{err}</p> : null}
          <div className="flex justify-end gap-1">
            <button type="button" className="btn-ghost text-[10px]" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary text-[10px]" disabled={busy}>
              {busy ? "…" : "Save"}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-[10px] text-teal-700 hover:underline"
            onClick={() => setOpen(true)}
          >
            + Add
          </button>
          {isNative() ? (
            <button
              type="button"
              className="text-[10px] text-teal-700 hover:underline"
              disabled={busy}
              onClick={quickCapture}
            >
              📷 Camera
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
