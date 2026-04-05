import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { bootstrapUserProfile } from "@/lib/profile-service";
import AccountClient from "./account-client";

export default async function AccountPage() {
  const user = await requireUser();
  if (!user) {
    redirect("/login");
  }

  try {
    await bootstrapUserProfile(user, { source: "account-page" });
  } catch (error) {
    console.error("Account page profile error:", error);
  }

  return <AccountClient />;
}
