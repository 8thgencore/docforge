import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Label, Select, Textarea } from "@/components/ui";
import { GroupSelector } from "@/features/groups/group-selector";
import { useGroups } from "@/features/groups/use-groups";
import { api } from "@/shared/api/client";
import { toApiError } from "@/shared/api/errors";
import type { DraftResponse } from "@/shared/api/types";
import { useApiConfig } from "@/shared/api/use-api-config";
import { useI18n } from "@/shared/i18n/use-i18n";

export const DraftPage = () => {
  const config = useApiConfig();
  const groupsQuery = useGroups();
  const { t } = useI18n();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [length, setLength] = useState("medium");
  const [tone, setTone] = useState("neutral");
  const [format, setFormat] = useState("report");
  const [draft, setDraft] = useState<DraftResponse | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.generateDraft(config, {
        group_id: selectedGroupId,
        prompt,
        length,
        tone,
        format,
      }),
    onSuccess: (data) => {
      setDraft(data);
    },
    onError: (error) => {
      toast.error(toApiError(error).message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("draft.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <GroupSelector groups={groupsQuery.data ?? []} value={selectedGroupId} onChange={setSelectedGroupId} />
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="length">{t("draft.length")}</Label>
              <Select id="length" value={length} onChange={(event) => setLength(event.target.value)}>
                <option value="short">short</option>
                <option value="medium">medium</option>
                <option value="long">long</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tone">{t("draft.tone")}</Label>
              <Select id="tone" value={tone} onChange={(event) => setTone(event.target.value)}>
                <option value="neutral">neutral</option>
                <option value="formal">formal</option>
                <option value="friendly">friendly</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="format">{t("draft.format")}</Label>
              <Select id="format" value={format} onChange={(event) => setFormat(event.target.value)}>
                <option value="report">report</option>
                <option value="memo">memo</option>
                <option value="summary">summary</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="prompt">{t("draft.prompt")}</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Prepare a launch-readiness summary based on uploaded documents"
            />
          </div>

          <div>
            <Button
              disabled={!selectedGroupId || !prompt || !config.apiKey || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? t("draft.loading") : t("draft.action")}
            </Button>
          </div>

          {draft && (
            <div className="border-border space-y-4 rounded-md border p-4">
              <h3 className="text-lg font-semibold">{draft.title}</h3>
              <div className="space-y-2">
                {draft.sections.map((section, index) => (
                  <p key={`${index}-${section.slice(0, 10)}`} className="text-sm leading-6">
                    {section}
                  </p>
                ))}
              </div>

              {draft.warnings.length > 0 && (
                <div className="space-y-2 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                  {draft.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-muted-foreground text-xs tracking-wide uppercase">{t("draft.citations")}</p>
                {draft.citations.map((citation) => (
                  <div key={citation.chunk_id} className="border-border rounded border p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge>{citation.score.toFixed(3)}</Badge>
                      <span>{citation.filename}</span>
                    </div>
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
