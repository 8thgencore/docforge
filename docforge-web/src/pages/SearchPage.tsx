import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@/components/ui";
import { GroupSelector } from "@/features/groups/group-selector";
import { useGroups } from "@/features/groups/use-groups";
import { TagInput } from "@/features/tags/tag-input";
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
  const [tag, setTag] = useState("");
  const [topK, setTopK] = useState("8");
  const [results, setResults] = useState<SearchHit[]>([]);

  const searchMutation = useMutation({
    mutationFn: () =>
      api.search(config, {
        query,
        group_id: selectedGroupId || undefined,
        tag: tag || undefined,
        top_k: Number(topK),
      }),
    onSuccess: (data) => {
      setResults(data.results);
    },
    onError: (error) => {
      toast.error(toApiError(error).message);
    },
  });

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

          <div className="grid gap-4 md:grid-cols-3">
            <GroupSelector
              groups={groupsQuery.data ?? []}
              value={selectedGroupId}
              onChange={setSelectedGroupId}
              allowAll
            />
            <TagInput value={tag} onChange={setTag} label={t("tags.labelFilter")} />
            <div className="grid gap-2">
              <Label htmlFor="top-k">{t("search.topK")}</Label>
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

          <div className="space-y-3">
            {results.map((item) => (
              <div key={item.chunk_id} className="border-border rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Badge>
                    {t("search.score")} {item.score.toFixed(3)}
                  </Badge>
                  <p className="text-muted-foreground text-sm">{item.filename}</p>
                </div>
                <p className="mt-2 text-sm">{item.text}</p>
              </div>
            ))}
            {!results.length && !searchMutation.isPending && (
              <p className="text-muted-foreground text-sm">{t("search.empty")}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
