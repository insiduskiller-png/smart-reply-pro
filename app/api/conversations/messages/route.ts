import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getConversationMessagesByThread,
  getConversationThreadById,
} from "@/lib/supabase";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const threadId = url.searchParams.get("threadId") ?? "";

    if (!threadId) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400 });
    }

    const thread = await getConversationThreadById(threadId, user.id);
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const messages = await getConversationMessagesByThread({
      threadId,
      userId: user.id,
      limit: 100,
    });

    return NextResponse.json({
      thread,
      messages: messages.slice().reverse(),
    });
  } catch (error) {
    console.error("Fetch thread messages error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
