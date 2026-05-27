import "./globals.css";
import Link from "next/link";
import { Nav } from "./components/Nav";
import { LogoutButton } from "./components/LogoutButton";
import { Wordmark } from "./components/ui";
import { getSession } from "./lib/session";

export const metadata = {
  title: {
    default: "DiamondPD — Safer youth baseball practices",
    template: "%s · DiamondPD",
  },
  description:
    "Compile age-appropriate, safety-checked baseball practice plans. Backed by USA Baseball Pitch Smart, NSCA, and CDC.",
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

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-700 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to main content
        </a>
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
            <Link href="/" className="no-underline hover:no-underline">
              <Wordmark />
            </Link>
            <Nav role={role} />
            <div className="flex items-center gap-3 text-sm text-slate-600">
              {session ? (
                <>
                  <span className="hidden md:inline">
                    {session.user.name ?? session.user.email}
                  </span>
                  <span className="badge-info">{session.user.role}</span>
                  <LogoutButton />
                </>
              ) : (
                <Link href="/login" className="btn-ghost text-sm no-underline hover:no-underline">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-6 py-10">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>
              Sourced from{" "}
              <a className="text-slate-700 no-underline hover:underline" href="https://www.mlb.com/pitch-smart">
                USA Baseball Pitch Smart
              </a>
              {" · "}NSCA YT&amp;C · CDC Heads Up · Stop Sports Injuries
            </p>
            <p className="flex items-center gap-3">
              <Link className="text-slate-600 no-underline hover:underline" href="/safety">
                Safety
              </Link>
              <Link className="text-slate-600 no-underline hover:underline" href="/admin/status">
                Platform status
              </Link>
              <span>© {new Date().getFullYear()} DiamondPD</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

