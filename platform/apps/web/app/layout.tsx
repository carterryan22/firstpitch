import "./globals.css";
import Link from "next/link";
import { Bungee, Rye, Special_Elite, Roboto_Slab, Inter } from "next/font/google";
import { Nav } from "./components/Nav";
import { LogoutButton } from "./components/LogoutButton";
import { MobileRefresh } from "./components/MobileRefresh";
import { UpdateBanner } from "./components/UpdateBanner";
import { OfflineBanner } from "./components/OfflineBanner";
import { Wordmark } from "./components/ui";
import { Analytics } from "./components/Analytics";
import { getSession } from "./lib/session";
import { siteUrl } from "./lib/site";

// Adopted from dugout-dirt.com: Bungee (display), Rye (western emphasis),
// Special Elite (typewriter meta), Roboto Slab (body).
const display = Bungee({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" });
const western = Rye({ subsets: ["latin"], weight: "400", variable: "--font-western", display: "swap" });
const typeFace = Special_Elite({ subsets: ["latin"], weight: "400", variable: "--font-type", display: "swap" });
const slab = Roboto_Slab({ subsets: ["latin"], variable: "--font-slab", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "First Pitch: Know before you throw. Plan, train, track.",
    template: "%s · First Pitch",
  },
  description:
    "Inclusive youth-baseball training, planning, and tracking. Compile safe practices, scout local fields, and follow every player's progress. Backed by USA Baseball Pitch Smart, NSCA, and CDC.",
  manifest: "/manifest.webmanifest",
  applicationName: "First Pitch",
  appleWebApp: {
    capable: true,
    title: "First Pitch",
    statusBarStyle: "black-translucent" as const,
  },
  formatDetection: { telephone: false },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  themeColor: "#1f1a17",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  // Allow pinch zoom for accessibility; do NOT lock user-scalable=no
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Layout must never throw, or every route 500s before its own error handler runs.
  let session: Awaited<ReturnType<typeof getSession>> = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }
  const role = session?.user.role ?? null;
  const fontVars = `${display.variable} ${western.variable} ${typeFace.variable} ${slab.variable} ${body.variable}`;

  return (
    <html lang="en" className={fontVars}>
      <body className="min-h-screen bg-cream font-sans text-ink pb-safe pt-safe">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-none focus:bg-ink focus:px-3 focus:py-2 focus:text-sm focus:text-cream"
        >
          Skip to content
        </a>
        <UpdateBanner />
        <OfflineBanner />
        <header className="sticky top-0 z-30 border-b-2 border-ink bg-ink text-cream">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
            <Link href="/" className="inline-flex min-h-[44px] items-center no-underline hover:no-underline">
              <Wordmark dark />
            </Link>
            <Nav role={role} />
            <div className="flex items-center gap-3 text-sm text-cream/80">
              {session ? (
                <>
                  <span className="hidden md:inline quote text-cream/70">
                    {session.user.name ?? session.user.email}
                  </span>
                  <span className="badge border-cream/40 text-cream/90">{session.user.role}</span>
                  <LogoutButton />
                </>
              ) : (
                <Link
                  href="/login"
                  className="btn border-[3px] border-cream bg-transparent text-cream hover:bg-cream hover:text-ink no-underline hover:no-underline"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-6 py-10">
          {children}
        </main>
        {/* Pushes new web deploys into the iOS/iPad Capacitor shell and
            installed PWAs without requiring a TestFlight rebuild. */}
        <MobileRefresh />
        {/* Third-party analytics never loads in signed-in areas, so no tracking
            script runs while a child's roster, metrics, or lineup is on screen
            (Apple Kids Category / COPPA). Public marketing pages only, and only
            when an analytics domain is configured. */}
        {session ? null : <Analytics />}
        <footer className="border-t-2 border-ink bg-cream">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-xs text-dirt-700 md:flex-row md:items-center md:justify-between">
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 quote">
              <Link className="inline-flex min-h-[44px] items-center text-ink no-underline hover:underline" href="/fields">Fields</Link>
              <Link className="inline-flex min-h-[44px] items-center text-ink no-underline hover:underline" href="/gear">Gear</Link>
              <Link className="inline-flex min-h-[44px] items-center text-ink no-underline hover:underline" href="/safety">Safety</Link>
              <Link className="inline-flex min-h-[44px] items-center text-ink no-underline hover:underline" href="/policy/ai-boundaries">Policy</Link>
              <Link className="inline-flex min-h-[44px] items-center text-ink no-underline hover:underline" href="/policy/privacy">Privacy</Link>
              <Link className="inline-flex min-h-[44px] items-center text-ink no-underline hover:underline" href="/policy/cookies">Cookies</Link>
              <Link className="inline-flex min-h-[44px] items-center text-ink no-underline hover:underline" href="/policy/terms">Terms</Link>
              <span>© {new Date().getFullYear()} First Pitch</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

