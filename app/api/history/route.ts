import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  try {
    const { modelId, accessToken } = await request.json();

    if (!modelId || !accessToken) {
      return NextResponse.json(
        { error: "Missing modelId or accessToken." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient(accessToken);
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("model_id", modelId)
      .maybeSingle();

    if (!conversation) {
      return NextResponse.json({ messages: [] });
    }

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      return NextResponse.json(
        { error: messagesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load history." },
      { status: 500 }
    );
  }
}
