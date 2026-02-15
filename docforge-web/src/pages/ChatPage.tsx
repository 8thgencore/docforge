import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Label, Textarea } from "@/components/ui";
import { GroupSelector } from "@/features/groups/group-selector";
import { useGroups } from "@/features/groups/use-groups";
import { TagInput } from "@/features/tags/tag-input";
import { api } from "@/shared/api/client";
import { toApiError } from "@/shared/api/errors";
import type { ChatResponse } from "@/shared/api/types";
import { useApiConfig } from "@/shared/api/use-api-config";
import { useI18n } from "@/shared/i18n/use-i18n";

export const ChatPage = () => {
  const config = useApiConfig();
  const groupsQuery = useGroups();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [tag, setTag] = useState("");
  const [response, setResponse] = useState<ChatResponse | null>(null);

  const chatMutation = useMutation({
    mutationFn: () =>
      api.chat(config, {
        query,
        group_id: selectedGroupId || undefined,
        tag: tag || undefined,
      }),
    onSuccess: (data) => {
      setResponse(data);
    },
    onError: (error) => {
      toast.error(toApiError(error).message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("chat.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2 md:grid-cols-2">
            <GroupSelector
              groups={groupsQuery.data ?? []}
              value={selectedGroupId}
              onChange={setSelectedGroupId}
              allowAll
            />
            <TagInput value={tag} onChange={setTag} label={t("tags.labelFilter")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="chat-query">{t("chat.question")}</Label>
            <Textarea
              id="chat-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Summarize SLA obligations in the uploaded contracts"
            />
          </div>

          <div>
            <Button disabled={!query || !config.apiKey || chatMutation.isPending} onClick={() => chatMutation.mutate()}>
              {chatMutation.isPending ? t("chat.loading") : t("chat.action")}
            </Button>
          </div>

          {response && (
            <div className="border-border space-y-3 rounded-md border p-4">
              {response.insufficient_context && (
                <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                  {t("chat.insufficient")}
                </p>
              )}
              <p className="text-sm leading-6 whitespace-pre-wrap">{response.answer}</p>
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs tracking-wide uppercase">{t("chat.citations")}</p>
                {response.citations.map((citation) => (
                  <div key={citation.chunk_id} className="border-border rounded border p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge>{citation.score.toFixed(3)}</Badge>
                      <span>{citation.filename}</span>
                    </div>
                    <p className="text-muted-foreground mt-1">chunk: {citation.chunk_id}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
