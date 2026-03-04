import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getUserProfile } from "@/lib/supabase";
import { templates } from "@/lib/templates";

export default async function TemplatesPage() {
  const user = await requireUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);
  const isPro = (profile?.subscription_status ?? "free").toLowerCase() === "pro";

  if (!isPro) {
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
