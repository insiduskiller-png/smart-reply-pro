import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/security";
import { generateStyleSummary } from "@/lib/openai";
import {
  createReplyProfile,
  getReplyProfileCountByUser,
  getReplyProfileById,
  getReplyProfilesByUser,
  insertProfileMessage,
  getUserProfile,
  updateReplyProfileDetails,
} from "@/lib/supabase";

const categoryOptions = new Set([
  "Dating",
  "Work",
  "Client",
  "Family",
  "Friend",
  "Conflict",
  "Other",
]);

function mapCreateProfileError(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null | undefined) {
  if (!error) return "Could not create profile. Please try again.";

  const columnFromError = (() => {
    const source = `${error.message ?? ""} ${error.details ?? ""}`;
    const match = source.match(/column\s+"([a-zA-Z0-9_]+)"/i);
    return match?.[1] ?? "";
  })();

  if (error.code === "42501") return "Database permission error while creating profile.";
  if (error.code === "42P01") return "Reply profile table is missing. Please run migrations.";
  if (error.code === "42703") return "Profile schema mismatch detected. Please run latest migrations.";
  if (error.code === "23502") {
    if (columnFromError === "profile_name") return "Profile name is required.";
    if (columnFromError === "user_id") return "You must be logged in to create a profile.";
    if (columnFromError) return `Missing required field: ${columnFromError}.`;
    return "Missing required profile field. Please complete required fields.";
  }
  if (error.code === "23503") return "Invalid user reference for profile creation.";

  return error.message || "Could not create profile. Please try again.";
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const profiles = await getReplyProfilesByUser(user.id);
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("Fetch reply profiles error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to create a profile." }, { status: 401 });

  try {
    console.info("[reply-profiles][POST] create requested", { userId: user.id });

    const profile = await getUserProfile(user.id);
    const subscriptionStatus = String(profile?.subscription_status ?? "free").toLowerCase();
    const isPro = subscriptionStatus === "pro";
    const maxProfiles = isPro ? 3 : 1;

    const profileCount = await getReplyProfileCountByUser(user.id);
    console.info("[reply-profiles][POST] profile limit check", {
      userId: user.id,
      subscriptionStatus,
      isPro,
      maxProfiles,
      profileCount,
    });

    if (profileCount >= maxProfiles) {
      return NextResponse.json(
        {
          error: isPro
            ? "You have reached your profile limit (3)."
            : "Free plan allows 1 Reply Profile. Upgrade to create more.",
          limit: maxProfiles,
          used: profileCount,
          upgrade_required: !isPro,
        },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    console.info("[reply-profiles][POST] submitted form payload", {
      profile_name: body?.profile_name ?? null,
      category: body?.category ?? null,
      context_notes: body?.context_notes ?? null,
      style_memory: body?.style_memory ?? null,
    });

    const profileName = sanitizeText(body.profile_name, 80);
    const categoryInput = sanitizeText(body.category, 30);
    const category = categoryOptions.has(categoryInput)
      ? categoryInput
      : "";
    const contextNotes = sanitizeText(body.context_notes, 1000);
    const styleMemoryInput = sanitizeText(body.style_memory, 10000);

    const validatedPayload = {
      user_id: user.id,
      profile_name: profileName,
      category: category || null,
      context_notes: contextNotes || null,
      style_memory: null as string | null,
    };

    console.info("[reply-profiles][POST] validated payload (pre-style)", validatedPayload);

    const missingRequired: string[] = [];
    if (!validatedPayload.user_id) missingRequired.push("user_id");
    if (!validatedPayload.profile_name) missingRequired.push("profile_name");

    if (missingRequired.length > 0) {
      console.error("[reply-profiles][POST] validation failed", {
        missingRequired,
        validatedPayload,
      });

      if (missingRequired.includes("profile_name")) {
        return NextResponse.json({ error: "Profile name is required." }, { status: 400 });
      }

      if (missingRequired.includes("user_id")) {
        return NextResponse.json({ error: "You must be logged in to create a profile." }, { status: 401 });
      }

      return NextResponse.json({ error: `Missing required field: ${missingRequired[0]}` }, { status: 400 });
    }

    let styleSummary = "";
    let parsedStyle: Record<string, unknown> | null = null;
    try {
      styleSummary = await generateStyleSummary({
        contactName: profileName,
        relationshipType: category || "Unspecified",
        contextNotes,
        chatHistory: styleMemoryInput,
      });
      parsedStyle = JSON.parse(styleSummary);
    } catch (styleError) {
      console.error("Style summary generation failed:", styleError);
    }

    validatedPayload.style_memory =
      typeof parsedStyle?.summary === "string"
        ? parsedStyle.summary
        : styleMemoryInput || styleSummary || null;

    console.info("[reply-profiles][POST] validated payload (final pre-insert)", validatedPayload);

    const createResult = await createReplyProfile({
      userId: user.id,
      profileName,
      category: category || undefined,
      contextNotes,
      styleMemory: validatedPayload.style_memory || undefined,
    });

    const createdProfile = createResult.profile;

    if (!createdProfile) {
      console.error("[reply-profiles][POST] create failed", {
        userId: user.id,
        profileName,
        error: createResult.error,
      });

      const reason = mapCreateProfileError(createResult.error);
      return NextResponse.json(
        { error: reason },
        { status: 500 },
      );
    }

    console.info("[reply-profiles][POST] create success", {
      userId: user.id,
      profileId: createdProfile.id,
    });

    if (styleMemoryInput) {
      await insertProfileMessage({
        profileId: createdProfile.id,
        userId: user.id,
        role: "history_import",
        content: styleMemoryInput,
      });
    }

    return NextResponse.json({
      profile: createdProfile,
      limit: maxProfiles,
      used: profileCount + 1,
      remaining: Math.max(0, maxProfiles - (profileCount + 1)),
    });
  } catch (error) {
    console.error("Create reply profile error:", error);
    return NextResponse.json({ error: "Could not create profile. Please try again." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const profileId = sanitizeText(body.profileId, 80);
    const profileName = sanitizeText(body.profile_name, 80);
    const categoryInput = sanitizeText(body.category, 30);
    const category = categoryOptions.has(categoryInput)
      ? categoryInput
      : "";
    const contextNotes = sanitizeText(body.context_notes, 1000);

    if (!profileId) {
      return NextResponse.json({ error: "profileId is required." }, { status: 400 });
    }

    if (!profileName) {
      return NextResponse.json({ error: "Profile name is required." }, { status: 400 });
    }

    const existing = await getReplyProfileById(profileId, user.id);
    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const updated = await updateReplyProfileDetails({
      profileId,
      userId: user.id,
      profileName,
      category: category || null,
      contextNotes: contextNotes || null,
    });

    if (!updated) {
      return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
    }

    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error("Update reply profile error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
