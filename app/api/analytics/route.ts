import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { enforceRateLimit, extractRequestIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Rate-limit by IP: max 60 events per minute. Return 202 even when throttled
  // so the client-side fire-and-forget pattern never sees errors.
  const ip = extractRequestIp(request);
  const rate = enforceRateLimit(`analytics:${ip}`, 60, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ success: true }, { status: 202 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { event, userId, metadata, timestamp } = body;

    if (!event) {
      return NextResponse.json({ error: "Event is required" }, { status: 400 });
    }

    // Store event in Supabase
    const { error } = await supabaseService
      .from("analytics_events")
      .insert({
        event,
        user_id: userId || null,
        metadata: metadata || {},
        timestamp: timestamp || new Date().toISOString(),
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
        user_agent: request.headers.get("user-agent") || null,
      });

    if (error) {
      console.error("Analytics insert error:", error);
      // Don't return error to client - just log it
    }

    return NextResponse.json({ success: true }, { status: 202 });
  } catch (err) {
    console.error("Analytics endpoint error:", err);
    // Return 202 regardless - we don't want to fail the client request
    return NextResponse.json({ success: true }, { status: 202 });
  }
}
