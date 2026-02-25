import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@/components/ui";
import { GroupSelector } from "@/features/groups/group-selector";
import { useGroups } from "@/features/groups/use-groups";
import { api } from "@/shared/api/client";
import { toApiError } from "@/shared/api/errors";
import type { SearchHit } from "@/shared/api/types";
import { useApiConfig } from "@/shared/api/use-api-config";
import { useI18n } from "@/shared/i18n/use-i18n";

export const SearchPage = () => {
  const config = useApiConfig();
  const groupsQuery = useGroups();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [topK, setTopK] = useState("8");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [expandedDocumentIds, setExpandedDocumentIds] = useState<Record<string, boolean>>({});

  const searchMutation = useMutation({
    mutationFn: () =>
      api.search(config, {
        query,
        group_id: selectedGroupId || undefined,
        top_k: Number(topK),
      }),
    onSuccess: (data) => {
      setResults(data.results);
      setExpandedDocumentIds({});
    },
    onError: (error) => {
      toast.error(toApiError(error).message);
    },
  });

  const uniqueResults = useMemo(() => {
    const deduplicated = new Map<string, SearchHit>();
    for (const result of results) {
      if (!deduplicated.has(result.document_id)) {
        deduplicated.set(result.document_id, {
          ...result,
          chunks: [...result.chunks].sort((left, right) => right.score - left.score),
        });
        continue;
      }
      const existing = deduplicated.get(result.document_id);
      if (!existing) {
        continue;
      }
      const chunkMap = new Map(existing.chunks.map((chunk) => [chunk.chunk_id, chunk]));
      for (const chunk of result.chunks) {
        chunkMap.set(chunk.chunk_id, chunk);
      }
      deduplicated.set(result.document_id, {
        ...existing,
        score: Math.max(existing.score, result.score),
        chunks: [...chunkMap.values()].sort((left, right) => right.score - left.score),
      });
    }
    return [...deduplicated.values()].sort((left, right) => right.score - left.score);
  }, [results]);

  const toggleExpanded = (documentId: string) => {
    setExpandedDocumentIds((current) => ({
      ...current,
      [documentId]: !current[documentId],
    }));
  };

  const formatDate = (value: string | null) => {
    if (!value) {
      return t("search.unknownDate");
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return t("search.unknownDate");
    }
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
  };

  const trimChunkText = (value: string) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length <= 240) {
      return normalized;
    }
    return `${normalized.slice(0, 240)}...`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("search.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="search-query">{t("search.query")}</Label>
            <Input
              id="search-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What does the contract say about penalties?"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <GroupSelector
              groups={groupsQuery.data ?? []}
              value={selectedGroupId}
              onChange={setSelectedGroupId}
              allowAll
            />
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="top-k">{t("search.topK")}</Label>
                <div className="group relative">
                  <span
                    className="bg-muted text-muted-foreground cursor-help rounded-full px-2 py-0.5 text-xs font-medium"
                    tabIndex={0}
                    aria-label={t("search.topKHint")}
                  >
                    i
                  </span>
                  <div className="bg-card text-card-foreground border-border pointer-events-none invisible absolute top-full left-1/2 z-20 mt-2 w-72 -translate-x-1/2 rounded-md border p-2 text-xs leading-5 opacity-0 shadow-md transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    {t("search.topKHint")}
                  </div>
                </div>
              </div>
              <Select id="top-k" value={topK} onChange={(event) => setTopK(event.target.value)}>
                {[4, 8, 12, 20, 30].map((value) => (
                  <option key={value} value={value.toString()}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Button
              disabled={!query || !config.apiKey || searchMutation.isPending}
              onClick={() => searchMutation.mutate()}
            >
              {searchMutation.isPending ? t("search.loading") : t("search.action")}
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {uniqueResults.map((item) => {
              const isExpanded = Boolean(expandedDocumentIds[item.document_id]);
              const chunksToRender = isExpanded ? item.chunks : item.chunks.slice(0, 2);
              return (
                <div key={item.document_id} className="border-border bg-card/60 rounded-md border p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{item.filename}</p>
                    <Badge>{`${t("search.group")}: ${item.group_name ?? t("search.unknownGroup")}`}</Badge>
                    <Badge>{`${t("search.added")}: ${formatDate(item.created_at)}`}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge title={t("search.scoreHint")} aria-label={t("search.scoreHint")}>
                      {t("search.score")} {item.score.toFixed(3)}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {chunksToRender.map((chunk) => (
                      <div key={chunk.chunk_id} className="bg-muted/40 rounded-sm p-2 text-sm">
                        <p className="leading-6">{trimChunkText(chunk.text)}</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {t("search.score")} {chunk.score.toFixed(3)}
                        </p>
                      </div>
                    ))}
                  </div>
                  {item.chunks.length > 2 && (
                    <div className="mt-3">
                      <Button type="button" size="sm" variant="ghost" onClick={() => toggleExpanded(item.document_id)}>
                        {isExpanded ? t("search.showLess") : t("search.showMore")}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            {!uniqueResults.length && !searchMutation.isPending && (
              <p className="text-muted-foreground text-sm">{t("search.empty")}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
