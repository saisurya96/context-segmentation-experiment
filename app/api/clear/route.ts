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
      return NextResponse.json({ ok: true });
    }

    const { error: deleteError } = await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", conversation.id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to clear chat." },
      { status: 500 }
    );
  }
}
