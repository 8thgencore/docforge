import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { GroupSelector } from "@/features/groups/group-selector";
import { useGroups } from "@/features/groups/use-groups";
import { api } from "@/shared/api/client";
import { toApiError } from "@/shared/api/errors";
import type { IngestionStatus, IngestionStatusResponse } from "@/shared/api/types";
import { useApiConfig } from "@/shared/api/use-api-config";
import { useI18n } from "@/shared/i18n/use-i18n";

const isActiveIngestionStatus = (status: IngestionStatus) => ["queued", "running", "retrying"].includes(status);
const fileNameKeys = ["filename", "file_name", "current_file", "current_filename"] as const;

const statusBadgeClassByStatus: Record<IngestionStatus, string> = {
  queued: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  running: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  retrying: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  paused: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
  failed: "bg-red-500/10 text-red-700 dark:text-red-300",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const readNumber = (stats: Record<string, unknown> | null, key: string) => {
  const value = stats?.[key];
  return typeof value === "number" ? value : null;
};

const isZipArchive = (file: File) => file.name.toLowerCase().endsWith(".zip") || file.type === "application/zip";

const readFileName = (stats: Record<string, unknown> | null) => {
  for (const key of fileNameKeys) {
    const value = stats?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const getJobFileName = (job: IngestionStatusResponse, fallback: string) => {
  if (job.filename?.trim()) {
    return job.filename;
  }
  return readFileName(job.stats) ?? fallback;
};

export const IngestionPage = () => {
  const config = useApiConfig();
  const { language, t } = useI18n();
  const queryClient = useQueryClient();
  const groupsQuery = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGroupId) {
        throw new Error(t("groups.selectGroup"));
      }

      if (!files.length) {
        throw new Error(t("ingestion.selectFilesError"));
      }

      if (files.length === 1 && isZipArchive(files[0])) {
        return api.uploadZip(config, selectedGroupId, files[0]);
      }

      return api.uploadDocuments(config, selectedGroupId, files);
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
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
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
  const groupNameById = useMemo(
    () => new Map((groupsQuery.data ?? []).map((group) => [group.id, group.name])),
    [groupsQuery.data],
  );
  const dateFormatter = new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("ingestion.uploadTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid content-start gap-4">
              <GroupSelector
                groups={groupsQuery.data ?? []}
                value={selectedGroupId}
                onChange={setSelectedGroupId}
                label={t("ingestion.groupSearchLabel")}
              />
              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={uploadMutation.isPending || !selectedGroupId || !config.apiKey}
              >
                {uploadMutation.isPending ? t("ingestion.uploading") : t("ingestion.start")}
              </Button>
            </div>

            <div className="grid content-start gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              />
              <div
                role="button"
                tabIndex={0}
                className={`rounded-md border-2 border-dashed p-6 text-center transition-colors ${
                  isDragging ? "border-sky-500 bg-sky-500/10" : "border-border bg-muted/30 hover:bg-muted/50"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  setFiles(Array.from(event.dataTransfer.files ?? []));
                }}
              >
                <p className="text-sm font-medium">{t("ingestion.dropZoneTitle")}</p>
                <p className="text-muted-foreground mt-1 text-xs">{t("ingestion.dropZoneHint")}</p>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("ingestion.selectedFiles")}: {files.length}
              </p>
              {files.length > 0 && (
                <p className="text-muted-foreground truncate text-xs">
                  {files
                    .slice(0, 3)
                    .map((file) => file.name)
                    .join(", ")}
                  {files.length > 3 ? "..." : ""}
                </p>
              )}
            </div>
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
                <div className="grid gap-2 md:grid-cols-2">
                  {currentIngestions.map((job) => (
                    <div key={job.id} className="border-border rounded-md border p-3">
                      {(() => {
                        const ingestedDocuments = readNumber(job.stats, "ingested_documents");
                        const totalDocuments = readNumber(job.stats, "total_documents");
                        const duplicates = readNumber(job.stats, "duplicates");
                        const fileName = getJobFileName(job, t("ingestion.fileUnknown"));
                        const progressValue = Math.round(job.progress * 100);
                        return (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-muted-foreground text-xs">
                                {t("ingestion.file")}: <span className="text-foreground">{fileName}</span>
                              </p>
                              <Badge className={statusBadgeClassByStatus[job.status]}>{job.status}</Badge>
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">
                              {t("ingestion.createdAt")}: {dateFormatter.format(new Date(job.created_at))}
                            </p>
                            <p className="text-muted-foreground mt-1 text-xs">
                              {t("search.group")}: {groupNameById.get(job.group_id) ?? t("search.unknownGroup")}
                            </p>
                            <div className="mt-2 grid gap-1.5 text-xs">
                              <p>
                                {t("ingestion.documents")}: {ingestedDocuments ?? 0}
                                {totalDocuments !== null ? ` / ${totalDocuments}` : ""}
                              </p>
                              {duplicates !== null && (
                                <p>
                                  {t("ingestion.duplicates")}: {duplicates}
                                </p>
                              )}
                            </div>
                            <div className="mt-2">
                              <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                                <div
                                  className="h-full bg-sky-600 transition-[width] duration-300"
                                  style={{ width: `${progressValue}%` }}
                                />
                              </div>
                              <p className="text-muted-foreground mt-1 text-xs">
                                {t("ingestion.progress")}: {progressValue}%
                              </p>
                            </div>
                          </>
                        );
                      })()}
                      {job.error && (
                        <p className="text-destructive text-xs">
                          {t("ingestion.error")}: {job.error}
                        </p>
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
              <div className="grid gap-2 md:grid-cols-2">
                {recentIngestions.map((job) => (
                  <div key={job.id} className="border-border rounded-md border p-3">
                    {(() => {
                      const ingestedDocuments = readNumber(job.stats, "ingested_documents");
                      const totalDocuments = readNumber(job.stats, "total_documents");
                      const duplicates = readNumber(job.stats, "duplicates");
                      const fileName = getJobFileName(job, t("ingestion.fileUnknown"));
                      const progressValue = Math.round(job.progress * 100);
                      return (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-muted-foreground text-xs">
                              {t("ingestion.file")}: <span className="text-foreground">{fileName}</span>
                            </p>
                            <Badge className={statusBadgeClassByStatus[job.status]}>{job.status}</Badge>
                          </div>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {t("ingestion.createdAt")}: {dateFormatter.format(new Date(job.created_at))}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {t("search.group")}: {groupNameById.get(job.group_id) ?? t("search.unknownGroup")}
                          </p>
                          <div className="mt-2 grid gap-1.5 text-xs">
                            <p>
                              {t("ingestion.documents")}: {ingestedDocuments ?? 0}
                              {totalDocuments !== null ? ` / ${totalDocuments}` : ""}
                            </p>
                            {duplicates !== null && (
                              <p>
                                {t("ingestion.duplicates")}: {duplicates}
                              </p>
                            )}
                          </div>
                          <div className="mt-2">
                            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                              <div
                                className="h-full bg-sky-600 transition-[width] duration-300"
                                style={{ width: `${progressValue}%` }}
                              />
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">
                              {t("ingestion.progress")}: {progressValue}%
                            </p>
                          </div>
                        </>
                      );
                    })()}
                    {job.error && (
                      <p className="text-destructive text-xs">
                        {t("ingestion.error")}: {job.error}
                      </p>
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
