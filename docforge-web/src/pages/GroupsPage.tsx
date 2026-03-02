import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eraser, FolderKanban, PencilLine, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@/components/ui";
import { useGroups } from "@/features/groups/use-groups";
import { api } from "@/shared/api/client";
import { toApiError } from "@/shared/api/errors";
import type { GroupResponse } from "@/shared/api/types";
import { useApiConfig } from "@/shared/api/use-api-config";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { useI18n } from "@/shared/i18n/use-i18n";

const schema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type GroupSortMode = "name" | "newest";
type GroupFilterMode = "all" | "with_description" | "without_description";

interface DialogShellProps {
  children: ReactNode;
  closeLabel: string;
  onClose: () => void;
  title: string;
}

const DialogShell = ({ children, closeLabel, onClose, title }: DialogShellProps) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <Card
          aria-modal="true"
          className="max-h-[90vh] w-full max-w-xl overflow-auto"
          role="dialog"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <CardHeader className="border-border border-b pb-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{title}</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                {closeLabel}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
};

export const GroupsPage = () => {
  const config = useApiConfig();
  const queryClient = useQueryClient();
  const { language, t } = useI18n();
  const groupsQuery = useGroups();
  const [groupSearch, setGroupSearch] = useState("");
  const [sortMode, setSortMode] = useState<GroupSortMode>("newest");
  const [filterMode, setFilterMode] = useState<GroupFilterMode>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const debouncedGroupSearch = useDebounce(groupSearch.trim().toLowerCase(), 350);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [activeClearGroupId, setActiveClearGroupId] = useState<string | null>(null);
  const [activeDeleteGroupId, setActiveDeleteGroupId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const editForm = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const refreshGroups = async () => {
    await queryClient.invalidateQueries({ queryKey: ["groups"] });
  };

  const closeCreateDialog = () => {
    setIsCreateOpen(false);
    form.reset();
  };

  const closeEditDialog = () => {
    setEditingGroupId(null);
    editForm.reset();
  };

  const createGroupMutation = useMutation({
    mutationFn: (payload: FormValues) => api.createGroup(config, payload),
    onSuccess: async () => {
      toast.success(t("groups.createAction"));
      closeCreateDialog();
      await refreshGroups();
    },
    onError: (error) => {
      toast.error(toApiError(error).message);
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ groupId, payload }: { groupId: string; payload: FormValues }) =>
      api.updateGroup(config, groupId, payload),
    onSuccess: async () => {
      toast.success(t("groups.updateSuccess"));
      closeEditDialog();
      await refreshGroups();
    },
    onError: (error) => {
      toast.error(toApiError(error).message);
    },
  });

  const clearDocumentsMutation = useMutation({
    mutationFn: (groupId: string) => api.clearGroupDocuments(config, groupId),
    onSuccess: async (data) => {
      toast.success(`${t("groups.clearSuccess")}: ${data.deleted_documents}`);
      setActiveClearGroupId(null);
      await refreshGroups();
    },
    onError: (error) => {
      setActiveClearGroupId(null);
      toast.error(toApiError(error).message);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => api.deleteGroup(config, groupId),
    onSuccess: async () => {
      toast.success(t("groups.deleteSuccess"));
      setActiveDeleteGroupId(null);
      await refreshGroups();
    },
    onError: (error) => {
      setActiveDeleteGroupId(null);
      toast.error(toApiError(error).message);
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    createGroupMutation.mutate(values);
  });

  const onEditSubmit = editForm.handleSubmit((values) => {
    if (!editingGroupId) {
      return;
    }
    updateGroupMutation.mutate({ groupId: editingGroupId, payload: values });
  });

  const groups = groupsQuery.data ?? [];
  const editingGroup = useMemo(
    () => groups.find((group) => group.id === editingGroupId) ?? null,
    [editingGroupId, groups],
  );

  const filteredAndSortedGroups = useMemo(() => {
    const filtered = groups.filter((group) => {
      const hasDescription = Boolean(group.description?.trim());
      if (filterMode === "with_description" && !hasDescription) {
        return false;
      }
      if (filterMode === "without_description" && hasDescription) {
        return false;
      }
      if (!debouncedGroupSearch) {
        return true;
      }
      return group.name.toLowerCase().includes(debouncedGroupSearch);
    });

    if (sortMode === "name") {
      return [...filtered].sort((left, right) => left.name.localeCompare(right.name, language === "ru" ? "ru" : "en"));
    }
    return [...filtered].sort((left, right) => +new Date(right.created_at) - +new Date(left.created_at));
  }, [debouncedGroupSearch, filterMode, groups, language, sortMode]);

  const groupsStats = useMemo(() => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const withDescription = groups.filter((group) => Boolean(group.description?.trim())).length;
    const createdRecently = groups.filter((group) => now - +new Date(group.created_at) <= sevenDaysMs).length;
    return {
      total: groups.length,
      withDescription,
      createdRecently,
    };
  }, [groups]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US", {
        dateStyle: "medium",
      }),
    [language],
  );

  const openEditor = (group: GroupResponse) => {
    setEditingGroupId(group.id);
    editForm.reset({
      name: group.name,
      description: group.description ?? "",
    });
  };

  useEffect(() => {
    if (!isCreateOpen && !editingGroupId) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      if (editingGroupId) {
        closeEditDialog();
        return;
      }
      closeCreateDialog();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [editingGroupId, isCreateOpen]);

  const hasGroups = groups.length > 0;
  const showGrid = !groupsQuery.isLoading && !groupsQuery.isError && filteredAndSortedGroups.length > 0;

  return (
    <>
      <div className="grid gap-6">
        <Card className="from-card via-card to-muted/30 overflow-hidden bg-gradient-to-br">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <FolderKanban className="text-primary size-5" />
                  {t("groups.list")}
                </CardTitle>
                <p className="text-muted-foreground mt-2 text-sm">{t("groups.subtitle")}</p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  form.reset();
                  setIsCreateOpen(true);
                }}
                disabled={!config.apiKey}
              >
                <Plus className="mr-2 size-4" />
                {t("groups.createAction")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border-border bg-card/80 rounded-md border p-3">
                <p className="text-muted-foreground text-xs uppercase">{t("groups.metrics.total")}</p>
                <p className="mt-1 text-2xl font-semibold">{groupsStats.total}</p>
              </div>
              <div className="border-border bg-card/80 rounded-md border p-3">
                <p className="text-muted-foreground text-xs uppercase">{t("groups.metrics.withDescription")}</p>
                <p className="mt-1 text-2xl font-semibold">{groupsStats.withDescription}</p>
              </div>
              <div className="border-border bg-card/80 rounded-md border p-3">
                <p className="text-muted-foreground text-xs uppercase">{t("groups.metrics.last7days")}</p>
                <p className="mt-1 text-2xl font-semibold">{groupsStats.createdRecently}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("groups.toolbarTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
              <div className="grid gap-2">
                <Label htmlFor="group-search">{t("groups.searchLabel")}</Label>
                <Input
                  id="group-search"
                  value={groupSearch}
                  onChange={(event) => setGroupSearch(event.target.value)}
                  placeholder={t("groups.searchPlaceholder")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="groups-sort">{t("groups.sortLabel")}</Label>
                <Select
                  id="groups-sort"
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as GroupSortMode)}
                >
                  <option value="newest">{t("groups.sortNewest")}</option>
                  <option value="name">{t("groups.sortName")}</option>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="groups-filter">{t("groups.filterLabel")}</Label>
                <Select
                  id="groups-filter"
                  value={filterMode}
                  onChange={(event) => setFilterMode(event.target.value as GroupFilterMode)}
                >
                  <option value="all">{t("groups.filterAll")}</option>
                  <option value="with_description">{t("groups.filterWithDescription")}</option>
                  <option value="without_description">{t("groups.filterWithoutDescription")}</option>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full md:w-auto"
                  onClick={() => groupsQuery.refetch()}
                >
                  <RefreshCw className="mr-2 size-4" />
                  {t("groups.refresh")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {groupsQuery.isLoading && (
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={`groups-skeleton-${index}`} className="animate-pulse">
                <CardContent className="p-5">
                  <div className="bg-muted h-5 w-1/2 rounded" />
                  <div className="bg-muted mt-3 h-4 w-11/12 rounded" />
                  <div className="bg-muted mt-2 h-4 w-8/12 rounded" />
                  <div className="mt-4 flex gap-2">
                    <div className="bg-muted h-8 w-20 rounded" />
                    <div className="bg-muted h-8 w-24 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {groupsQuery.isError && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="text-sm font-medium">{t("groups.errorTitle")}</p>
                <p className="text-muted-foreground mt-1 text-sm">{toApiError(groupsQuery.error).message}</p>
              </div>
              <Button type="button" variant="outline" onClick={() => groupsQuery.refetch()}>
                <RefreshCw className="mr-2 size-4" />
                {t("groups.retry")}
              </Button>
            </CardContent>
          </Card>
        )}

        {showGrid && (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredAndSortedGroups.map((group) => {
              const hasDescription = Boolean(group.description?.trim());
              return (
                <Card
                  key={group.id}
                  className="bg-card/80 border-border/80 transition-all duration-200 hover:shadow-md"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">{group.name}</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {t("groups.createdAt")}: {dateFormatter.format(new Date(group.created_at))}
                        </p>
                      </div>
                      <Badge className={hasDescription ? "" : "bg-muted text-muted-foreground"}>
                        {hasDescription ? t("groups.badgeDescribed") : t("groups.badgeNoDescription")}
                      </Badge>
                    </div>

                    <p
                      className="text-muted-foreground mt-3 min-h-10 text-sm"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {group.description || t("groups.noDescription")}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => openEditor(group)}>
                        <PencilLine className="mr-1.5 size-3.5" />
                        {t("groups.editAction")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const shouldClear = window.confirm(`${t("groups.clearConfirm")} "${group.name}"?`);
                          if (!shouldClear) {
                            return;
                          }
                          setActiveClearGroupId(group.id);
                          clearDocumentsMutation.mutate(group.id);
                        }}
                        disabled={clearDocumentsMutation.isPending}
                      >
                        <Eraser className="mr-1.5 size-3.5" />
                        {activeClearGroupId === group.id && clearDocumentsMutation.isPending
                          ? t("groups.clearing")
                          : t("groups.clearDocuments")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          const shouldDelete = window.confirm(`${t("groups.deleteConfirm")} "${group.name}"?`);
                          if (!shouldDelete) {
                            return;
                          }
                          setActiveDeleteGroupId(group.id);
                          deleteGroupMutation.mutate(group.id);
                        }}
                        disabled={deleteGroupMutation.isPending}
                      >
                        <Trash2 className="mr-1.5 size-3.5" />
                        {activeDeleteGroupId === group.id && deleteGroupMutation.isPending
                          ? t("groups.deleting")
                          : t("groups.deleteAction")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!groupsQuery.isLoading && !groupsQuery.isError && !filteredAndSortedGroups.length && (
          <Card className="border-dashed">
            <CardContent className="grid gap-3 p-8 text-center">
              <p className="text-base font-medium">
                {hasGroups ? t("groups.emptyFilteredTitle") : t("groups.emptyTitle")}
              </p>
              <p className="text-muted-foreground text-sm">
                {hasGroups ? t("groups.emptyFiltered") : t("groups.empty")}
              </p>
              {!hasGroups && (
                <div>
                  <Button
                    type="button"
                    onClick={() => {
                      form.reset();
                      setIsCreateOpen(true);
                    }}
                    disabled={!config.apiKey}
                  >
                    <Plus className="mr-2 size-4" />
                    {t("groups.createAction")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {isCreateOpen && (
        <DialogShell title={t("groups.create")} closeLabel={t("groups.cancelEdit")} onClose={closeCreateDialog}>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="create-group-name">{t("groups.name")}</Label>
              <Input id="create-group-name" placeholder="Contracts 2026" {...form.register("name")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-group-description">{t("groups.description")}</Label>
              <Input id="create-group-description" placeholder="Legal docs" {...form.register("description")} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={createGroupMutation.isPending || !config.apiKey}>
                {createGroupMutation.isPending ? t("groups.creating") : t("groups.createAction")}
              </Button>
              <Button type="button" variant="outline" onClick={closeCreateDialog}>
                {t("groups.cancelEdit")}
              </Button>
            </div>
          </form>
        </DialogShell>
      )}

      {editingGroup && (
        <DialogShell
          title={`${t("groups.editTitle")}: ${editingGroup.name}`}
          closeLabel={t("groups.cancelEdit")}
          onClose={closeEditDialog}
        >
          <form className="grid gap-4" onSubmit={onEditSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="edit-group-name">{t("groups.name")}</Label>
              <Input id="edit-group-name" {...editForm.register("name")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-group-description">{t("groups.description")}</Label>
              <Input id="edit-group-description" {...editForm.register("description")} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={updateGroupMutation.isPending}>
                {updateGroupMutation.isPending ? t("groups.updating") : t("groups.saveEdit")}
              </Button>
              <Button type="button" variant="outline" onClick={closeEditDialog}>
                {t("groups.cancelEdit")}
              </Button>
            </div>
          </form>
        </DialogShell>
      )}
    </>
  );
};
