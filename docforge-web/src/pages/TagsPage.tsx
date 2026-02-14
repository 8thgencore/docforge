import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui'
import { api } from '@/shared/api/client'
import { toApiError } from '@/shared/api/errors'
import { useApiConfig } from '@/shared/api/use-api-config'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useI18n } from '@/shared/i18n/use-i18n'

export const TagsPage = () => {
  const config = useApiConfig()
  const queryClient = useQueryClient()
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [newTag, setNewTag] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const debouncedSearch = useDebounce(search.trim(), 300)

  const tagsQuery = useQuery({
    queryKey: ['tags', config.baseUrl, config.apiKey, debouncedSearch],
    queryFn: () => api.listTags(config, debouncedSearch),
    enabled: Boolean(config.apiKey),
  })

  const refreshTags = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tags'] })
  }

  const createMutation = useMutation({
    mutationFn: () => api.createTag(config, { name: newTag }),
    onSuccess: async () => {
      toast.success(t('tags.created'))
      setNewTag('')
      await refreshTags()
    },
    onError: (error) => {
      toast.error(toApiError(error).message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (params: { tagId: string; name: string }) =>
      api.updateTag(config, params.tagId, { name: params.name }),
    onSuccess: async () => {
      toast.success(t('tags.updated'))
      setEditingId(null)
      setEditingName('')
      await refreshTags()
    },
    onError: (error) => {
      toast.error(toApiError(error).message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (tagId: string) => api.deleteTag(config, tagId),
    onSuccess: async () => {
      toast.success(t('tags.deleted'))
      await refreshTags()
    },
    onError: (error) => {
      toast.error(toApiError(error).message)
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tags.pageTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">{t('tags.pageHint')}</p>

          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <Input value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder={t('tags.newPlaceholder')} />
            <Button disabled={!newTag.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {t('tags.addAction')}
            </Button>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tag-search">{t('tags.searchLabel')}</Label>
            <Input
              id="tag-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('tags.searchPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            {tagsQuery.data?.map((tag) => (
              <div key={tag.id} className="rounded-md border border-border p-3">
                {editingId === tag.id ? (
                  <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                    <Input value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                    <Button
                      onClick={() => updateMutation.mutate({ tagId: tag.id, name: editingName })}
                      disabled={!editingName.trim() || updateMutation.isPending}
                    >
                      {t('tags.saveAction')}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingId(null)}>
                      {t('tags.cancelAction')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{tag.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tag.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(tag.id)
                          setEditingName(tag.name)
                        }}
                      >
                        {t('tags.renameAction')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(tag.id)}>
                        {t('tags.deleteAction')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {!tagsQuery.data?.length && <p className="text-sm text-muted-foreground">{t('tags.empty')}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
