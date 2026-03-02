import { useMutation } from "@tanstack/react-query";
import { SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { Badge, Button, Label, Select, Textarea } from "@/components/ui";
import { GroupSelector } from "@/features/groups/group-selector";
import { useGroups } from "@/features/groups/use-groups";
import { api } from "@/shared/api/client";
import { toApiError } from "@/shared/api/errors";
import type { Citation } from "@/shared/api/types";
import { useApiConfig } from "@/shared/api/use-api-config";
import { useI18n } from "@/shared/i18n/use-i18n";

interface ChatMessage {
  content: string;
  id: string;
  insufficientContext?: boolean;
  role: "assistant" | "user";
  citations?: Citation[];
}

const buildMessageId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const ChatPage = () => {
  const config = useApiConfig();
  const groupsQuery = useGroups();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [topK, setTopK] = useState("8");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  const chatMutation = useMutation({
    mutationFn: (question: string) =>
      api.chat(config, {
        query: question,
        group_id: selectedGroupId || undefined,
        top_k: Number(topK),
      }),
    onSuccess: (data) => {
      setMessages((current) => [
        ...current,
        {
          content: data.answer,
          id: buildMessageId(),
          role: "assistant",
          citations: data.citations,
          insufficientContext: data.quality?.low_confidence ?? data.insufficient_context,
        },
      ]);
    },
    onError: (error) => {
      toast.error(toApiError(error).message);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = query.trim();
    if (!question || chatMutation.isPending || !config.apiKey) {
      return;
    }
    setMessages((current) => [...current, { content: question, id: buildMessageId(), role: "user" }]);
    setQuery("");
    chatMutation.mutate(question);
  };

  const handleQueryKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    const question = query.trim();
    if (!question || chatMutation.isPending || !config.apiKey) {
      return;
    }
    setMessages((current) => [...current, { content: question, id: buildMessageId(), role: "user" }]);
    setQuery("");
    chatMutation.mutate(question);
  };

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, chatMutation.isPending]);

  const buildDocumentHref = (documentUrl: string | null) => {
    if (!documentUrl) {
      return null;
    }
    try {
      return new URL(documentUrl, config.baseUrl).toString();
    } catch {
      return null;
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <section className="flex min-h-0 w-full flex-1 flex-col px-4 md:px-8">
        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            {!messages.length && <p className="text-muted-foreground text-center text-sm">{t("chat.empty")}</p>}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground ml-auto rounded-br-sm"
                    : "bg-card border-border text-foreground rounded-bl-sm border"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.role === "assistant" && message.insufficientContext && (
                  <p className="mt-3 rounded-md bg-amber-500/15 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">
                    {t("chat.insufficient")}
                  </p>
                )}
                {message.role === "assistant" && Boolean(message.citations?.length) && (
                  <div className="mt-3 space-y-2">
                    <p className="text-muted-foreground text-xs tracking-wide uppercase">{t("chat.citations")}</p>
                    {message.citations?.map((citation) => (
                      <div key={citation.chunk_id} className="border-border rounded border p-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          {citation.index ? <Badge>{`[${citation.index}]`}</Badge> : null}
                          <Badge>{citation.score.toFixed(3)}</Badge>
                          <span>{citation.filename}</span>
                          {citation.group_name ? (
                            <span className="text-muted-foreground">{`(${citation.group_name})`}</span>
                          ) : null}
                        </div>
                        <p className="text-muted-foreground mt-1">
                          {citation.chunk_index !== null && citation.chunk_index !== undefined
                            ? `chunk #${citation.chunk_index}`
                            : `chunk: ${citation.chunk_id}`}
                        </p>
                        {citation.snippet ? (
                          <p className="text-muted-foreground mt-1 line-clamp-3">{citation.snippet}</p>
                        ) : null}
                        {buildDocumentHref(citation.document_url) ? (
                          <a
                            className="mt-2 inline-block underline"
                            href={buildDocumentHref(citation.document_url) ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t("chat.openSource")}
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="bg-card border-border max-w-[92%] rounded-2xl rounded-bl-sm border px-4 py-3 text-sm">
                {t("chat.loading")}
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </div>
        </div>
      </section>

      <form className="border-border bg-background/95 w-full border-t px-4 py-4 backdrop-blur" onSubmit={handleSubmit}>
        <div className="mx-auto grid w-full max-w-4xl gap-3">
          <div className="grid gap-2">
            <Label htmlFor="chat-query">{t("chat.question")}</Label>
            <Textarea
              id="chat-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleQueryKeyDown}
              placeholder="Summarize SLA obligations in the uploaded contracts"
              className="min-h-24"
            />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-3">
            <div className="min-w-0">
              <GroupSelector
                groups={groupsQuery.data ?? []}
                value={selectedGroupId}
                onChange={setSelectedGroupId}
                allowAll
                hideLabel
                openUp
              />
            </div>
            <div className="flex w-32 items-center gap-2">
              <div className="group relative">
                <span
                  className="bg-muted text-muted-foreground cursor-help rounded-full px-2 py-0.5 text-xs font-medium"
                  tabIndex={0}
                  aria-label={t("search.topKHint")}
                >
                  i
                </span>
                <div className="bg-card text-card-foreground border-border pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-72 -translate-x-1/2 rounded-md border p-2 text-xs leading-5 opacity-0 shadow-md transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  {t("search.topKHint")}
                </div>
              </div>
              <Label htmlFor="chat-top-k" className="sr-only">
                {t("search.topK")}
              </Label>
              <Select
                id="chat-top-k"
                value={topK}
                onChange={(event) => setTopK(event.target.value)}
                aria-label={t("search.topK")}
              >
                {[4, 8, 12, 20, 30].map((value) => (
                  <option key={value} value={value.toString()}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              type="submit"
              size="sm"
              className="h-10 w-10 p-0"
              disabled={!query.trim() || !config.apiKey || chatMutation.isPending}
              aria-label={chatMutation.isPending ? t("chat.loading") : t("chat.action")}
              title={chatMutation.isPending ? t("chat.loading") : t("chat.action")}
            >
              <SendHorizontal className="size-4" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
