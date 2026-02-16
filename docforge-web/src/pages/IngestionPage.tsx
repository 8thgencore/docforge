import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@/components/ui";
import { GroupSelector } from "@/features/groups/group-selector";
import { useGroups } from "@/features/groups/use-groups";
import { TagInput } from "@/features/tags/tag-input";
import { api } from "@/shared/api/client";
import { toApiError } from "@/shared/api/errors";
import type { IngestionStatus } from "@/shared/api/types";
import { useApiConfig } from "@/shared/api/use-api-config";
import { useI18n } from "@/shared/i18n/use-i18n";

const isActiveIngestionStatus = (status: IngestionStatus) => ["queued", "running", "retrying"].includes(status);

export const IngestionPage = () => {
  const config = useApiConfig();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const groupsQuery = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [tag, setTag] = useState("");
  const [uploadMode, setUploadMode] = useState<"files" | "zip">("files");
  const [files, setFiles] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGroupId) {
        throw new Error(t("groups.selectGroup"));
      }

      if (uploadMode === "files") {
        if (!files.length) {
          throw new Error(t("ingestion.selectFilesError"));
        }
        return api.uploadDocuments(config, selectedGroupId, files, tag);
      }

      if (!zipFile) {
        throw new Error(t("ingestion.selectZipError"));
      }

      return api.uploadZip(config, selectedGroupId, zipFile, tag);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ingestions"] });
      toast.success(`${t("ingestion.started")}: ${data.ingestion_id}`);
    },
    onError: (error) => {
      toast.error(toApiError(error).message);
    },
  });

  const ingestionsQuery = useQuery({
    queryKey: ["ingestions", selectedGroupId || "all", config.baseUrl, config.apiKey],
    queryFn: () => api.listIngestions(config, selectedGroupId || undefined),
    enabled: Boolean(config.apiKey),
    refetchInterval: 2500,
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.pauseIngestion(config, id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ingestions"] });
      toast.success(`${t("ingestion.paused")}: ${data.id}`);
    },
    onError: (error) => {
      toast.error(toApiError(error).message);
    },
  });

  const ingestions = ingestionsQuery.data ?? [];
  const currentIngestions = ingestions.filter((job) => isActiveIngestionStatus(job.status));
  const recentIngestions = ingestions.filter((job) => !isActiveIngestionStatus(job.status));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("ingestion.uploadTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <GroupSelector groups={groupsQuery.data ?? []} value={selectedGroupId} onChange={setSelectedGroupId} />
            <TagInput value={tag} onChange={setTag} label={t("tags.labelOptional")} />
            <div className="grid gap-2">
              <Label htmlFor="mode">{t("ingestion.mode")}</Label>
              <Select
                id="mode"
                value={uploadMode}
                onChange={(event) => setUploadMode(event.target.value as "files" | "zip")}
              >
                <option value="files">{t("ingestion.files")}</option>
                <option value="zip">{t("ingestion.zip")}</option>
              </Select>
            </div>
            {uploadMode === "files" ? (
              <Input type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
            ) : (
              <Input type="file" accept=".zip" onChange={(event) => setZipFile(event.target.files?.[0] ?? null)} />
            )}
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending || !selectedGroupId || !config.apiKey}
            >
              {uploadMutation.isPending ? t("ingestion.uploading") : t("ingestion.start")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("ingestion.statusTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {currentIngestions.length > 0 && (
              <div className="grid gap-2">
                <p className="text-sm font-medium">{t("ingestion.currentListTitle")}</p>
                <div className="grid gap-2">
                  {currentIngestions.map((job) => (
                    <div key={job.id} className="border-border rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-left text-xs">{job.id}</p>
                        <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-300">{job.status}</Badge>
                      </div>
                      <p className="mt-2 text-xs">
                        {t("ingestion.stage")}: {job.stage}
                      </p>
                      <p className="text-xs">
                        {t("ingestion.progress")}: {Math.round(job.progress * 100)}%
                      </p>
                      {job.error && (
                        <p className="text-destructive text-xs">
                          {t("ingestion.error")}: {job.error}
                        </p>
                      )}
                      {job.stats && (
                        <pre className="bg-muted mt-1 overflow-auto rounded p-2 text-xs">
                          {JSON.stringify(job.stats, null, 2)}
                        </pre>
                      )}
                      <Button
                        className="mt-2"
                        size="sm"
                        variant="outline"
                        onClick={() => pauseMutation.mutate(job.id)}
                        disabled={pauseMutation.isPending}
                      >
                        {t("ingestion.pause")}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <p className="text-sm font-medium">{t("ingestion.recentListTitle")}</p>
              <div className="grid gap-2">
                {recentIngestions.map((job) => (
                  <div key={job.id} className="border-border rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-left text-xs">{job.id}</p>
                      <Badge className="bg-slate-500/10 text-slate-700 dark:text-slate-300">{job.status}</Badge>
                    </div>
                    <p className="mt-2 text-xs">
                      {t("ingestion.stage")}: {job.stage}
                    </p>
                    <p className="text-xs">
                      {t("ingestion.progress")}: {Math.round(job.progress * 100)}%
                    </p>
                    {job.error && (
                      <p className="text-destructive text-xs">
                        {t("ingestion.error")}: {job.error}
                      </p>
                    )}
                    {job.stats && (
                      <pre className="bg-muted mt-1 overflow-auto rounded p-2 text-xs">
                        {JSON.stringify(job.stats, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
              {!ingestions.length && <p className="text-muted-foreground text-sm">{t("ingestion.emptyList")}</p>}
              {!recentIngestions.length && ingestions.length > 0 && (
                <p className="text-muted-foreground text-sm">{t("ingestion.noRecent")}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
