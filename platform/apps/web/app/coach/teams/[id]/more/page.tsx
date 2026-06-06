import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { Card } from "../../../../components/ui";

export const metadata = { title: "More" };

type MoreLink = {
  label: string;
  href: string;
  desc: string;
  icon: string;
  external?: boolean;
  soon?: boolean;
};

type MoreSection = { title: string; links: MoreLink[] };

export default async function TeamMorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const team = await getRepos().teams.byId(id);
  if (!team) notFound();
  const base = `/coach/teams/${id}`;

  const sections: MoreSection[] = [
    {
      title: "Manage",
      links: [
        { label: "Settings", href: `${base}/settings`, desc: "Lineup rules, team info, members.", icon: "⚙️" },
        { label: "Calendar", href: `${base}/calendar`, desc: "Season schedule + ICS export.", icon: "📆" },
        { label: "Snack duty", href: `${base}/snack`, desc: "Auto-balance the family snack rotation.", icon: "🍪" },
        { label: "Import CSV", href: `${base}/import`, desc: "Pull stats in from GameChanger.", icon: "📥" },
        { label: "Build practice", href: `/practice/new?teamId=${id}`, desc: "Compile a safety-checked plan.", icon: "🛠️" },
      ],
    },
    {
      title: "Insights",
      links: [
        { label: "Fairness", href: `${base}/fairness`, desc: "Playing-time equity heat-map.", icon: "⚖️" },
        { label: "Baselines", href: `${base}/baselines`, desc: "Per-player metrics + diagnosis.", icon: "📊" },
        { label: "Goals", href: `${base}/goals`, desc: "Development goals + progress.", icon: "🎯" },
        { label: "Weekly digest", href: `${base}/digest`, desc: "Send-ready parent summary.", icon: "📰" },
        { label: "Missions", href: `${base}/missions`, desc: "Assign home training to players.", icon: "🏠" },
      ],
    },
    {
      title: "Share & assist",
      links: [
        { label: "Press Box (public page)", href: `/teams/${team.slug}`, desc: "Parent-facing schedule + lineups. No PII beyond first names.", icon: "📣", external: true },
        { label: "Ask the coach AI", href: `${base}/ask`, desc: "Grounded answers about this team.", icon: "💬" },
      ],
    },
    {
      title: "Account & help",
      links: [
        { label: "Help center", href: "/policy", desc: "Platform, safety & AI boundaries.", icon: "❓" },
        { label: "Subscription", href: "/billing", desc: "Plans & billing.", icon: "💳" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={base} className="no-underline hover:underline">
            ← {team.name}
          </Link>
        </p>
        <h1 className="m-0">More</h1>
        <p className="mt-1 text-sm text-slate-600">
          Everything beyond the four core tabs — settings, insights, sharing and help for{" "}
          <strong>{team.name}</strong>.
        </p>
      </header>

      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="m-0 text-base font-semibold text-slate-800">{section.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.links.map((link) =>
              link.soon ? (
                <Card key={link.label} className="flex items-start gap-3 opacity-60">
                  <span aria-hidden className="text-xl leading-none">{link.icon}</span>
                  <div>
                    <p className="m-0 flex items-center gap-2 font-medium text-slate-800">
                      {link.label}
                      <span className="badge text-[10px]">Soon</span>
                    </p>
                    <p className="m-0 text-sm text-slate-500">{link.desc}</p>
                  </div>
                </Card>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  className="no-underline hover:no-underline"
                >
                  <Card className="flex h-full items-start gap-3 transition hover:border-field-700">
                    <span aria-hidden className="text-xl leading-none">{link.icon}</span>
                    <div>
                      <p className="m-0 font-medium text-slate-800">
                        {link.label}
                        {link.external ? " ↗" : ""}
                      </p>
                      <p className="m-0 text-sm text-slate-500">{link.desc}</p>
                    </div>
                  </Card>
                </Link>
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
