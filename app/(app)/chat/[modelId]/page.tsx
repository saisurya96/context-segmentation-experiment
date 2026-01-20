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
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { CopyIcon, RefreshCwIcon, CheckIcon } from "lucide-react";

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
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

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

  const handleCopyMessage = (messageId: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    }).catch((err) => {
      console.error("Failed to copy:", err);
    });
  };

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

  // Main layout with header and conversation
  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
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
          className="cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed"
          type="button"
          disabled={status === "submitted" || status === "streaming"}
        >
          Clear chat
        </button>
      </header>

      {/* Conversation */}
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<div className="text-4xl">💬</div>}
              title="Start a conversation"
              description="Messages will appear here as the conversation progresses."
            />
          ) : (
            messages.map((message, messageIndex) => {
              const isError = isErrorMessage(message.id);
              const isLastMessage = messageIndex === messages.length - 1;

              return message.parts.map((part, i) => {
                const isCopied = copiedMessageId === message.id;
                const partKey = `${message.id}-${i}`;
                const isStreamingLastMessage = status === "streaming" && isLastMessage && i === message.parts.length - 1;
                const isGLMModel = modelId === "zai/glm-4.5v";

                if (part.type === "text") {
                  return (
                    <div key={partKey}>
                      <Message from={message.role}>
                        <MessageContent>
                          {message.role === "assistant" && !isError ? (
                            <MessageResponse>{part.text}</MessageResponse>
                          ) : isError ? (
                            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
                              <p className="text-sm text-destructive">{part.text}</p>
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed">{part.text}</p>
                          )}
                        </MessageContent>
                      </Message>
                      {message.role === "assistant" && !isError && (
                        <MessageActions>
                          <MessageAction
                            tooltip={isCopied ? "Copied!" : "Copy message"}
                            onClick={() => handleCopyMessage(message.id, part.text)}
                          >
                            {isCopied ? (
                              <CheckIcon className="size-3" />
                            ) : (
                              <CopyIcon className="size-3" />
                            )}
                          </MessageAction>
                          {isLastMessage && status !== "streaming" && (
                            <MessageAction
                              tooltip="Regenerate response"
                              onClick={() => void loadHistory()}
                            >
                              <RefreshCwIcon className="size-3" />
                            </MessageAction>
                          )}
                        </MessageActions>
                      )}
                    </div>
                  );
                } else if (part.type === "reasoning" && isGLMModel) {
                  return (
                    <div key={partKey}>
                      <Message from={message.role}>
                        <MessageContent>
                          <Reasoning
                            className="w-full"
                            isStreaming={isStreamingLastMessage}
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>{part.text}</ReasoningContent>
                          </Reasoning>
                        </MessageContent>
                      </Message>
                    </div>
                  );
                }
                return null;
              });
            })
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <div className="inline-flex items-center">
                  <span className="inline-block size-2 rounded-full bg-current animate-pulse" />
                </div>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Error Display */}
      {error && (
        <div className="mx-auto w-full max-w-3xl px-4 py-2">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <strong className="font-medium">Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Input */}
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
