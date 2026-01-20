import { NextResponse } from "next/server";
import { streamText } from "ai";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { models, systemPrompt } from "@/lib/models";

// Use Edge runtime for proper streaming support
export const runtime = "edge";

type ChatRequestBody = {
  messages?: Array<{ role: string; content: string }>;
  input?: string;
  modelId?: string;
  accessToken?: string;
};

export async function POST(request: Request) {
  try {
    const { messages, input, modelId, accessToken } =
      (await request.json()) as ChatRequestBody;

    console.log("Chat request received:", { modelId, hasInput: !!input, hasMessages: !!messages, hasAccessToken: !!accessToken });

    if (!modelId || !accessToken) {
      return NextResponse.json(
        { error: "Missing modelId or accessToken." },
        { status: 400 }
      );
    }

    const modelConfig = models.find((m) => m.id === modelId);
    if (!modelConfig) {
      console.error("Model not found:", modelId);
      return NextResponse.json({ error: "Unknown model." }, { status: 400 });
    }

    console.log("Using model:", modelConfig);
    console.log("About to create Supabase client");

    const supabase = createSupabaseServerClient(accessToken);
    console.log("Supabase client created, getting user");
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    console.log("User data retrieved:", { hasUser: !!userData?.user, hasError: !!userError });

    if (userError || !userData.user) {
      console.log("Auth failed, returning 401");
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    console.log("Auth successful, extracting last message");

    const lastUserMessage =
      input ??
      messages
        ?.slice()
        .reverse()
        .find((message) => message.role === "user")?.content;

    if (!lastUserMessage) {
      return NextResponse.json(
        { error: "Missing user message." },
        { status: 400 }
      );
    }

    const { data: existingConversation, error: convoError } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("model_id", modelId)
      .maybeSingle();

    if (convoError) {
      return NextResponse.json({ error: convoError.message }, { status: 500 });
    }

    let conversationId = existingConversation?.id;

    if (!conversationId) {
      const { data: newConversation, error: createError } = await supabase
        .from("conversations")
        .insert({ user_id: userData.user.id, model_id: modelId })
        .select("id")
        .single();

      if (createError) {
        return NextResponse.json(
          { error: createError.message },
          { status: 500 }
        );
      }

      conversationId = newConversation.id;
    }

    const { error: insertUserError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: lastUserMessage,
      });

    if (insertUserError) {
      return NextResponse.json(
        { error: insertUserError.message },
        { status: 500 }
      );
    }

    const { data: history, error: historyError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .neq("role", "error")
      .order("created_at", { ascending: true });

    if (historyError) {
      return NextResponse.json(
        { error: historyError.message },
        { status: 500 }
      );
    }

    console.log("History loaded, preparing messages");

    const messagesToSend = [
      { role: "system" as const, content: systemPrompt },
      ...(history ?? []).map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      })),
    ];

    console.log("Calling streamText with model:", modelConfig.id, "and", messagesToSend.length, "messages");

    try {
      console.log("About to call streamText");
      const result = streamText({
        model: modelConfig.id, // Use model ID directly - AI SDK will route through gateway
        messages: messagesToSend,
        onFinish: async ({ text }) => {
          const trimmed = text.trim();
          if (!trimmed) {
            return;
          }

          await supabase.from("messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: trimmed,
          });
        },
      });

      console.log("streamText called successfully, returning response");
      return result.toUIMessageStreamResponse({
        sendReasoning: true,
      });
    } catch (error) {
      console.error("AI SDK error (inner catch):", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate response.";

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "error",
        content: errorMessage,
      });

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } catch (error) {
    console.error("Outer error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send message.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
