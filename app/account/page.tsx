import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ensureUserProfile } from "@/lib/supabase";
import AccountClient from "./account-client";

export default async function AccountPage() {
  const user = await requireUser();
  if (!user) {
    redirect("/login");
  }

  // Ensure profile exists
  try {
    await ensureUserProfile(user);
  } catch (error) {
    console.error("Account page profile error:", error);
  }

  return <AccountClient />;
}
