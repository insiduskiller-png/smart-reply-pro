import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  createConversationThread,
  getConversationThreadsByUser,
} from "@/lib/supabase";
import { sanitizeText } from "@/lib/security";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const threads = await getConversationThreadsByUser(user.id);
    return NextResponse.json({ threads });
  } catch (error) {
    console.error("Fetch threads error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const title = sanitizeText(body.title, 120) || "New Conversation";

    const thread = await createConversationThread({
      userId: user.id,
      title,
    });

    if (!thread) {
      return NextResponse.json({ error: "Could not create thread." }, { status: 500 });
    }

    return NextResponse.json({ thread });
  } catch (error) {
    console.error("Create thread error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
