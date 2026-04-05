import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard-client";
import { requireUser } from "@/lib/auth";
import { bootstrapUserProfile } from "@/lib/profile-service";
import { templates } from "@/lib/templates";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ template?: string | string[] }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const resolvedSearchParams = (await searchParams) ?? {};
  const templateId = typeof resolvedSearchParams.template === "string" ? resolvedSearchParams.template : "";
  const selectedTemplate = templates.find((template) => template.id === templateId);

  // Extract username from email (part before @)
  const username = (user.email ?? "").split("@")[0];

  const defaultProfile = {
    username,
    subscription_status: "free",
    daily_usage_count: 0,
  };

  let profile = defaultProfile;
  try {
    const bootstrap = await bootstrapUserProfile(user, { source: "dashboard-page" });
    const profileData = bootstrap.profile;
    if (profileData) {
      profile = {
        ...defaultProfile,
        ...profileData,
        subscription_status: profileData.subscription_status ?? "free",
      };
    }
  } catch (error) {
    console.error("Dashboard profile error:", error);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
      <DashboardClient profile={profile} initialTemplateInput={selectedTemplate?.text ?? ""} />
    </main>
  );
}
