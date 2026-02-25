import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard-client";
import { requireUser } from "@/lib/auth";
import { getUserProfile, upsertUserProfile } from "@/lib/supabase";

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  await upsertUserProfile({ id: user.id, email: user.email });
  const profile = await getUserProfile(user.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <DashboardClient profile={profile ?? { subscription_status: "free", daily_usage_count: 0 }} />
    </main>
  );
}
