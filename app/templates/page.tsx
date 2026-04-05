import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { bootstrapUserProfile } from "@/lib/profile-service";
import { templates } from "@/lib/templates";
import { hasProAccess, PRO_ENABLED, PRO_WAITLIST_HREF } from "@/lib/billing";

export default async function TemplatesPage() {
  const user = await requireUser();
  if (!user) {
    redirect("/login");
  }

  const bootstrap = await bootstrapUserProfile(user, { source: "templates-page" });
  const isPro = hasProAccess(bootstrap.profile.subscription_status);

  if (!isPro) {
    if (!PRO_ENABLED) {
      return (
        <main className="mx-auto max-w-4xl px-6 py-12">
          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-8 text-center">
            <div className="inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
              Template Library
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Template Library is available in Pro
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
              Free mode templates are included in the dashboard. The full library with additional templates will launch with the Pro tier.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard" className="inline-flex rounded-md bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200">
                Back to Dashboard
              </Link>
              <Link href={PRO_WAITLIST_HREF} className="inline-flex rounded-md border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-800">
                Join Waitlist
              </Link>
            </div>
          </div>
        </main>
      );
    }

    redirect("/pricing");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Template Library</h1>
          <p className="mt-2 text-sm text-slate-300">Use Pro templates to start faster in the dashboard.</p>
        </div>
        <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
          Pro Feature
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <article key={template.id} className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{template.title}</h2>
              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-300">
                Pro Feature
              </span>
            </div>
            <p className="mb-4 text-sm text-slate-300">{template.description}</p>
            <p className="mb-4 rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200">
              {template.text}
            </p>
            <Link
              href={`/dashboard?template=${template.id}`}
              className="inline-flex rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400"
            >
              Use Template
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
