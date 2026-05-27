import "./globals.css";
import Link from "next/link";
import { Nav } from "./components/Nav";
import { LogoutButton } from "./components/LogoutButton";
import { getSession } from "./lib/session";

export const metadata = {
  title: "Player Development Platform",
  description: "Safe, evidence-based youth athlete development.",
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
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
            <Link href="/" className="font-semibold text-slate-900 no-underline hover:no-underline">
              <span className="text-brand-700">●</span> Player Development Platform
            </Link>
            <Nav role={role} />
            <div className="flex items-center gap-2 text-xs text-slate-600">
              {session ? (
                <>
                  <span>
                    {session.user.name ?? session.user.email}{" "}
                    <span className="badge-info ml-1">{session.user.role}</span>
                  </span>
                  <LogoutButton />
                </>
              ) : (
                <Link href="/login" className="btn-ghost text-xs no-underline hover:no-underline">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-6 py-8 text-xs text-slate-500">
          Tier-1 sources: USA Baseball Pitch Smart · NSCA YT&amp;C · CDC Heads Up · Stop Sports Injuries
        </footer>
      </body>
    </html>
  );
}
