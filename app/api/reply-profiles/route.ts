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

const relationshipTypes = new Set([
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

  if (error.code === "42501") return "Database permission error while creating profile.";
  if (error.code === "42P01") return "Reply profile table is missing. Please run migrations.";
  if (error.code === "42703") return "Profile schema mismatch detected. Please run latest migrations.";
  if (error.code === "23502") return "Missing required profile field. Please complete required fields.";
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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const profileName = sanitizeText(body.profileName ?? body.contactName, 80);
    const relationshipTypeInput = sanitizeText(body.profileCategory ?? body.relationshipType, 30);
    const profileCategory = relationshipTypes.has(relationshipTypeInput)
      ? relationshipTypeInput
      : "";
    const contextNotes = sanitizeText(body.contextNotes, 1000);
    const chatHistory = sanitizeText(body.chatHistory, 10000);

    console.info("[reply-profiles][POST] sanitized payload", {
      userId: user.id,
      profileName,
      profileCategory: profileCategory || null,
      contextNotesLength: contextNotes.length,
      chatHistoryLength: chatHistory.length,
    });

    if (!profileName) {
      return NextResponse.json({ error: "Profile name is required." }, { status: 400 });
    }

    let styleSummary = "";
    let parsedStyle: Record<string, unknown> | null = null;
    try {
      styleSummary = await generateStyleSummary({
        contactName: profileName,
        relationshipType: profileCategory || "Unspecified",
        contextNotes,
        chatHistory,
      });
      parsedStyle = JSON.parse(styleSummary);
    } catch (styleError) {
      console.error("Style summary generation failed:", styleError);
    }

    const createResult = await createReplyProfile({
      userId: user.id,
      profileName,
      profileCategory: profileCategory || undefined,
      contextNotes,
      styleSummary:
        typeof parsedStyle?.summary === "string"
          ? parsedStyle.summary
          : styleSummary || undefined,
      tonePattern: typeof parsedStyle?.tone_pattern === "string" ? parsedStyle.tone_pattern : undefined,
      sentenceLength: typeof parsedStyle?.sentence_length === "string" ? parsedStyle.sentence_length : undefined,
      directnessLevel: typeof parsedStyle?.directness_level === "string" ? parsedStyle.directness_level : undefined,
      emojiUsage: typeof parsedStyle?.emoji_usage === "string" ? parsedStyle.emoji_usage : undefined,
      formalityLevel: typeof parsedStyle?.formality_level === "string" ? parsedStyle.formality_level : undefined,
      conflictStyle: typeof parsedStyle?.conflict_style === "string" ? parsedStyle.conflict_style : undefined,
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

    if (chatHistory) {
      await insertProfileMessage({
        profileId: createdProfile.id,
        userId: user.id,
        role: "history_import",
        content: chatHistory,
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
    const profileName = sanitizeText(body.profileName, 80);
    const relationshipTypeInput = sanitizeText(body.profileCategory ?? body.relationshipType, 30);
    const profileCategory = relationshipTypes.has(relationshipTypeInput)
      ? relationshipTypeInput
      : "";
    const contextNotes = sanitizeText(body.contextNotes, 1000);

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
      profileCategory: profileCategory || null,
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
