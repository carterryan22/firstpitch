"use client";

// Thin capability layer between the First Pitch web app and the Capacitor
// native shell (iOS / iPadOS / Android). Every helper here is safe to call
// from any browser context: when Capacitor isn't present, helpers fall back
// to standard web APIs or no-op.
//
// We deliberately do NOT add `@capacitor/*` to apps/web/package.json. Those
// modules only exist inside the native shell at runtime, so we resolve them
// through a string-indirection dynamic import that bundlers (Webpack/Turbopack)
// won't try to follow.

const dyn: (m: string) => Promise<unknown> =
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  typeof window === "undefined" ? () => Promise.reject(new Error("ssr")) : (Function("m", "return import(m)") as (m: string) => Promise<unknown>);

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => "web" | "ios" | "android";
};

export function getCapacitor(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { Capacitor?: CapacitorGlobal };
  return w.Capacitor ?? null;
}

export function isNative(): boolean {
  const cap = getCapacitor();
  return !!cap?.isNativePlatform?.();
}

export function platform(): "web" | "ios" | "android" {
  const cap = getCapacitor();
  return cap?.getPlatform?.() ?? "web";
}

// ─────────────────────────────────────────────────────────────────────────
// Share — native sheet on iOS/iPadOS via @capacitor/share, falls back to
// the Web Share API in the browser PWA, and finally to clipboard.
// ─────────────────────────────────────────────────────────────────────────
export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
}

export async function share(opts: ShareOptions): Promise<"native" | "web-share" | "clipboard" | "noop"> {
  if (isNative()) {
    try {
      const mod = (await dyn("@capacitor/share")) as { Share: { share: (o: ShareOptions) => Promise<unknown> } };
      await mod.Share.share(opts);
      return "native";
    } catch {
      // fall through to web fallbacks
    }
  }
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await (navigator as Navigator & { share: (o: ShareOptions) => Promise<void> }).share(opts);
      return "web-share";
    } catch {
      // user cancelled or unsupported
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    const payload = [opts.title, opts.text, opts.url].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      return "clipboard";
    } catch {
      // ignore
    }
  }
  return "noop";
}

// ─────────────────────────────────────────────────────────────────────────
// Camera — open the native camera on iOS via @capacitor/camera and return
// a data URL. On web, returns null so callers can fall back to a regular
// <input type="file" capture="environment"> element.
// ─────────────────────────────────────────────────────────────────────────
export interface CapturedPhoto {
  dataUrl: string;
  mimeType: string;
}

export async function captureFromCamera(): Promise<CapturedPhoto | null> {
  if (!isNative()) return null;
  try {
    const mod = (await dyn("@capacitor/camera")) as {
      Camera: {
        getPhoto: (o: Record<string, unknown>) => Promise<{ dataUrl?: string; format?: string }>;
      };
      CameraResultType: { DataUrl: string };
      CameraSource: { Camera: string };
    };
    const photo = await mod.Camera.getPhoto({
      resultType: mod.CameraResultType.DataUrl,
      source: mod.CameraSource.Camera,
      quality: 80,
      allowEditing: false,
      saveToGallery: false,
    });
    if (!photo.dataUrl) return null;
    return { dataUrl: photo.dataUrl, mimeType: `image/${photo.format ?? "jpeg"}` };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Local notifications — schedule a one-shot notification at a future time
// via @capacitor/local-notifications. Used today for "pitcher X is rest-
// eligible again on YYYY-MM-DD" reminders; can later drive game-day,
// hydration, and warmup alerts. No-op on web (no equivalent without
// service-worker push setup).
// ─────────────────────────────────────────────────────────────────────────
export interface LocalNotification {
  id: number;
  title: string;
  body: string;
  at: Date;
}

export async function scheduleLocalNotification(n: LocalNotification): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const mod = (await dyn("@capacitor/local-notifications")) as {
      LocalNotifications: {
        requestPermissions: () => Promise<{ display?: string }>;
        schedule: (o: { notifications: Array<Record<string, unknown>> }) => Promise<unknown>;
      };
    };
    const perm = await mod.LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return false;
    await mod.LocalNotifications.schedule({
      notifications: [
        {
          id: n.id,
          title: n.title,
          body: n.body,
          schedule: { at: n.at },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Haptic feedback — tiny tap on button confirmations. No-op on web.
// ─────────────────────────────────────────────────────────────────────────
export async function hapticTap(): Promise<void> {
  if (!isNative()) return;
  try {
    const mod = (await dyn("@capacitor/haptics")) as {
      Haptics: { impact: (o: { style: string }) => Promise<unknown> };
      ImpactStyle: { Light: string };
    };
    await mod.Haptics.impact({ style: mod.ImpactStyle.Light });
  } catch {
    // ignore
  }
}
