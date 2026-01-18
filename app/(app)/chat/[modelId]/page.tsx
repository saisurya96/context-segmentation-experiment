"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Chat, useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { supabase } from "@/lib/supabaseClient";
import { models } from "@/lib/models";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Loader } from "@/components/ai-elements/loader";

type DbMessage = {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  created_at: string;
};

export default function ChatPage() {
  const params = useParams();
  const modelId = decodeURIComponent(String(params?.modelId ?? ""));
  const model = useMemo(
    () => models.find((item) => item.id === modelId),
    [modelId]
  );

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState("");

  const chat = useMemo(() => {
    return new Chat({
      transport: new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => {
          // Get only the last user message (the new one being sent)
          const lastMessage = messages[messages.length - 1];
          const messageText = lastMessage?.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("");

          return {
            body: {
              input: messageText,
              modelId,
              accessToken,
            },
          };
        },
      }),
    });
  }, [modelId, accessToken]);

  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    chat,
    onError: (chatError) => {
      setError(chatError.message);
      void loadHistory();
    },
    onFinish: () => {
      // Reload history after response completes
      void loadHistory();
    },
  });

  const loadHistory = async () => {
    if (!accessToken) return;
    setError(null);

    const response = await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId, accessToken }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Failed to load history.");
      return;
    }

    const mapped = (payload.messages as DbMessage[] | undefined)?.map(
      (message) => ({
        id: message.role === "error" ? `error-${message.id}` : message.id,
        role: message.role === "error" ? ("assistant" as const) : (message.role as "user" | "assistant"),
        parts: [
          {
            type: "text" as const,
            text: message.content,
          },
        ],
      })
    );

    setMessages(mapped ?? []);
    setHistoryLoaded(true);
  };

  useEffect(() => {
    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;
      setAccessToken(token);
      if (!token) {
        setError("You are not signed in.");
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (accessToken && modelId) {
      void loadHistory();
    }
  }, [accessToken, modelId]);

  const handleClear = async () => {
    if (!accessToken) {
      setError("You are not signed in.");
      return;
    }

    const response = await fetch("/api/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId, accessToken }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Failed to clear chat.");
      return;
    }

    setMessages([]);
  };

  const isErrorMessage = (id?: string) =>
    typeof id === "string" && id.startsWith("error-");

  const handlePromptSubmit = async (message: PromptInputMessage) => {
    if (!accessToken) {
      setError("You are not signed in.");
      return;
    }

    const content = message.text?.trim();
    if (!content) return;

    setInput("");
    
    try {
      await sendMessage({ text: content });
    } catch (e) {
      // Error will be handled by onError callback
    }
  };

  if (!model) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Unknown model.
      </div>
    );
  }

  // Loading state
  if (!historyLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading conversation...</p>
      </div>
    );
  }

  // Empty state - centered input
  if (messages.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        {/* Custom header for chat page */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-medium hover:underline">
              Context Segmentation Experiment
            </Link>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{model.displayName}</span>
            <span className="text-xs text-muted-foreground/60">({model.id})</span>
          </div>
          <button
            onClick={handleClear}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
            type="button"
            disabled={status === "submitted" || status === "streaming"}
          >
            Clear chat
          </button>
        </header>

        {/* Centered empty state */}
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="w-full max-w-2xl space-y-8">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-semibold">Ready to learn?</h2>
              <p className="text-muted-foreground">Ask your first question to begin</p>
            </div>
            
            <PromptInput onSubmit={handlePromptSubmit}>
              <PromptInputBody>
                <PromptInputTextarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything about your learning topic..."
                />
              </PromptInputBody>
              <PromptInputFooter>
                <div className="flex-1" />
                <PromptInputSubmit
                  disabled={!accessToken || input.trim().length === 0}
                  status={status}
                />
              </PromptInputFooter>
            </PromptInput>

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <strong className="font-medium">Error:</strong> {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full conversation view
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Single sticky header with app name, model, and clear chat */}
      <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-medium hover:underline">
            Context Segmentation Experiment
          </Link>
          <span className="text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">{model.displayName}</span>
          <span className="text-xs text-muted-foreground/60">({model.id})</span>
        </div>
        <button
          onClick={handleClear}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
          type="button"
          disabled={status === "submitted" || status === "streaming"}
        >
          Clear chat
        </button>
      </header>

      {/* Messages - Scrollable */}
      <Conversation className="flex-1 overflow-y-auto">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.map((message) => {
            const isError = isErrorMessage(message.id);
            const isUser = message.role === "user";

            return (
              <div key={message.id}>
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <Message 
                        key={`${message.id}-${i}`} 
                        from={message.role}
                        className="mb-6"
                      >
                        <MessageContent
                          className={
                            isUser
                              ? "ml-auto w-fit max-w-[80%] rounded-2xl bg-zinc-200 px-4 py-3 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                              : isError
                              ? "w-fit rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-900"
                              : ""
                          }
                        >
                          {message.role === "assistant" && !isError ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:text-zinc-100">
                              <MessageResponse>{part.text}</MessageResponse>
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed">{part.text}</p>
                          )}
                        </MessageContent>
                      </Message>
                    );
                  }
                  return null;
                })}
              </div>
            );
          })}
          {status === "submitted" && <Loader />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Error Display */}
      {error && (
        <div className="mx-auto w-full max-w-3xl px-4 py-2">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <strong className="font-medium">Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Input - Sticky at bottom */}
      <div className="sticky bottom-0 shrink-0 border-t bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto w-full max-w-3xl">
          <PromptInput onSubmit={handlePromptSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about your learning topic..."
              />
            </PromptInputBody>
            <PromptInputFooter>
              <div className="flex-1" />
              <PromptInputSubmit
                disabled={!accessToken || input.trim().length === 0}
                status={status}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
