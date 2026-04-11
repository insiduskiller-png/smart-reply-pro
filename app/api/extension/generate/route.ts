import { NextResponse } from "next/server";
import { getSupabaseUser, getReplyProfileById } from "@/lib/supabase";
import { bootstrapUserProfile } from "@/lib/profile-service";
import { hasProAccess } from "@/lib/billing";
import { generateReply } from "@/lib/openai";
import { sanitizeText } from "@/lib/security";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function requireBearer(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7);
  try {
    return await getSupabaseUser(token);
  } catch {
    return null;
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  const user = await requireBearer(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS },
    );
  }

  try {
    const { profile } = await bootstrapUserProfile(user, {
      source: "extension-generate",
    });

    const isPro = hasProAccess(profile.subscription_status);

    if (!isPro) {
      return NextResponse.json(
        {
          error: "Pro subscription required",
          upgradeUrl: "https://www.smartreplypro.ai/pricing",
        },
        { status: 403, headers: CORS },
      );
    }

    const body = await request.json().catch(() => ({}));
    const input = sanitizeText(body.input, 4000);
    const context = sanitizeText(body.context, 800);
    const profileId = sanitizeText(body.profileId, 80);
    const sourceDomain = sanitizeText(body.sourceDomain, 256);
    const pageTitle = sanitizeText(body.pageTitle, 180);

    if (!input) {
      return NextResponse.json(
        { error: "Input is required" },
        { status: 400, headers: CORS },
      );
    }

    if (!profileId) {
      return NextResponse.json(
        { error: "profileId is required" },
        { status: 400, headers: CORS },
      );
    }

    const activeProfile = await getReplyProfileById(profileId, user.id);
    if (!activeProfile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404, headers: CORS },
      );
    }

    // Detect context type from profile category + input
    const professionalSignals = `${input} ${context ?? ""} ${activeProfile.category ?? ""}`.toLowerCase();
    const isProfessional = /\b(work|office|manager|leadership|client|vendor|team|business|project|executive|vp|director)\b/.test(
      professionalSignals,
    );

    // Build enriched context: surrounding page text + source platform
    const contextParts: string[] = [];
    if (context) contextParts.push(context);
    if (sourceDomain) contextParts.push(`Page Host: ${sourceDomain}`);
    if (pageTitle) contextParts.push(`Page Title: ${pageTitle}`);
    const enrichedContext = contextParts.join("\n") || undefined;

    const reply = await generateReply({
      input,
      context: enrichedContext,
      tone: isProfessional ? "Precision Authority" : "Direct",
      variant: "Strategic",
      profileContext: {
        contactName: activeProfile.profile_name,
        relationshipType: activeProfile.category ?? "Unspecified",
        contextNotes: activeProfile.context_notes ?? undefined,
        styleSummary: activeProfile.style_memory ?? undefined,
        profileSummary: activeProfile.profile_summary ?? undefined,
      },
    });

    return NextResponse.json({ reply }, { headers: CORS });
  } catch (err) {
    console.error("[extension][generate] error:", err);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500, headers: CORS },
    );
  }
}
