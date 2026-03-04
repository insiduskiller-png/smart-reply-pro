import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabaseService
      .from("usage")
      .select("count")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const count = data?.count ?? 0;
    return NextResponse.json({ count, limit: 5 });
  } catch (err) {
    console.error("Usage fetch error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().split("T")[0];

    // Increment usage count for today
    const { data, error } = await supabaseService
      .from("usage")
      .upsert({
        user_id: user.id,
        date: today,
        count: 1,
      })
      .select()
      .single();

    if (error) {
      console.error("Usage update error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Increment the count by 1
    const { error: incrementError } = await supabaseService
      .from("usage")
      .update({ count: data.count + 1, updated_at: new Date().toISOString() })
      .eq("id", data.id);

    if (incrementError) {
      console.error("Usage increment error:", incrementError);
      return NextResponse.json({ error: incrementError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: data.count + 1 });
  } catch (err) {
    console.error("Usage update error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
