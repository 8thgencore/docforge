import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
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

export const GroupsPage = () => {
  const config = useApiConfig();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const groupsQuery = useGroups();
  const [groupSearch, setGroupSearch] = useState("");
  const debouncedGroupSearch = useDebounce(groupSearch.trim().toLowerCase(), 350);
  const [editingGroup, setEditingGroup] = useState<GroupResponse | null>(null);

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

  const createGroupMutation = useMutation({
    mutationFn: (payload: FormValues) => api.createGroup(config, payload),
    onSuccess: async () => {
      toast.success(t("groups.createAction"));
      form.reset();
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
      setEditingGroup(null);
      editForm.reset();
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
      await refreshGroups();
    },
    onError: (error) => {
      toast.error(toApiError(error).message);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => api.deleteGroup(config, groupId),
    onSuccess: async () => {
      toast.success(t("groups.deleteSuccess"));
      await refreshGroups();
    },
    onError: (error) => {
      toast.error(toApiError(error).message);
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    createGroupMutation.mutate(values);
  });

  const onEditSubmit = editForm.handleSubmit((values) => {
    if (!editingGroup) {
      return;
    }
    updateGroupMutation.mutate({ groupId: editingGroup.id, payload: values });
  });

  const filteredGroups = useMemo(() => {
    const groups = groupsQuery.data ?? [];
    if (!debouncedGroupSearch) {
      return groups;
    }
    return groups.filter((group) => group.name.toLowerCase().includes(debouncedGroupSearch));
  }, [debouncedGroupSearch, groupsQuery.data]);

  const openEditor = (group: GroupResponse) => {
    setEditingGroup(group);
    editForm.reset({
      name: group.name,
      description: group.description ?? "",
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("groups.create")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="group-name">{t("groups.name")}</Label>
              <Input id="group-name" placeholder="Contracts 2026" {...form.register("name")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="group-description">{t("groups.description")}</Label>
              <Input id="group-description" placeholder="Legal docs" {...form.register("description")} />
            </div>
            <Button type="submit" disabled={createGroupMutation.isPending || !config.apiKey}>
              {createGroupMutation.isPending ? t("groups.creating") : t("groups.createAction")}
            </Button>
          </form>

          {editingGroup && (
            <form className="border-border mt-6 grid gap-4 border-t pt-4" onSubmit={onEditSubmit}>
              <p className="text-sm font-medium">{t("groups.editTitle")}</p>
              <div className="grid gap-2">
                <Label htmlFor="edit-group-name">{t("groups.name")}</Label>
                <Input id="edit-group-name" {...editForm.register("name")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-group-description">{t("groups.description")}</Label>
                <Input id="edit-group-description" {...editForm.register("description")} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={updateGroupMutation.isPending}>
                  {updateGroupMutation.isPending ? t("groups.updating") : t("groups.saveEdit")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingGroup(null)}>
                  {t("groups.cancelEdit")}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("groups.list")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-2">
            <Label htmlFor="group-search">{t("groups.searchLabel")}</Label>
            <Input
              id="group-search"
              value={groupSearch}
              onChange={(event) => setGroupSearch(event.target.value)}
              placeholder={t("groups.searchPlaceholder")}
            />
          </div>

          {groupsQuery.isLoading && <p className="text-muted-foreground text-sm">{t("groups.loading")}</p>}
          {groupsQuery.isError && <p className="text-destructive text-sm">{toApiError(groupsQuery.error).message}</p>}
          <div className="space-y-2">
            {filteredGroups.map((group) => (
              <div key={group.id} className="border-border rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{group.name}</p>
                  <Badge>{new Date(group.created_at).toLocaleDateString()}</Badge>
                </div>
                <p className="text-muted-foreground text-sm">{group.description || t("groups.noDescription")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEditor(group)}>
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
                      clearDocumentsMutation.mutate(group.id);
                    }}
                    disabled={clearDocumentsMutation.isPending}
                  >
                    {t("groups.clearDocuments")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const shouldDelete = window.confirm(`${t("groups.deleteConfirm")} "${group.name}"?`);
                      if (!shouldDelete) {
                        return;
                      }
                      deleteGroupMutation.mutate(group.id);
                    }}
                    disabled={deleteGroupMutation.isPending}
                  >
                    {t("groups.deleteAction")}
                  </Button>
                </div>
              </div>
            ))}
            {!filteredGroups.length && !groupsQuery.isLoading && (
              <p className="text-muted-foreground text-sm">{t("groups.empty")}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
