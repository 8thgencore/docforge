import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui'
import { api } from '@/shared/api/client'
import { toApiError } from '@/shared/api/errors'
import { useApiConfig } from '@/shared/api/use-api-config'
import { useI18n } from '@/shared/i18n/use-i18n'

const schema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export const GroupsPage = () => {
  const config = useApiConfig()
  const queryClient = useQueryClient()
  const { t } = useI18n()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  const groupsQuery = useQuery({
    queryKey: ['groups', config.baseUrl, config.apiKey],
    queryFn: () => api.listGroups(config),
    enabled: Boolean(config.apiKey),
  })

  const createGroupMutation = useMutation({
    mutationFn: (payload: FormValues) => api.createGroup(config, payload),
    onSuccess: () => {
      toast.success(t('groups.createAction'))
      void queryClient.invalidateQueries({ queryKey: ['groups'] })
      form.reset()
    },
    onError: (error) => {
      toast.error(toApiError(error).message)
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    createGroupMutation.mutate(values)
  })

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t('groups.create')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="group-name">{t('groups.name')}</Label>
              <Input id="group-name" placeholder="Contracts 2026" {...form.register('name')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="group-description">{t('groups.description')}</Label>
              <Input id="group-description" placeholder="Legal docs" {...form.register('description')} />
            </div>
            <Button type="submit" disabled={createGroupMutation.isPending || !config.apiKey}>
              {createGroupMutation.isPending ? t('groups.creating') : t('groups.createAction')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('groups.list')}</CardTitle>
        </CardHeader>
        <CardContent>
          {groupsQuery.isLoading && <p className="text-sm text-muted-foreground">{t('groups.loading')}</p>}
          {groupsQuery.isError && <p className="text-sm text-destructive">{toApiError(groupsQuery.error).message}</p>}
          <div className="space-y-2">
            {groupsQuery.data?.map((group) => (
              <div key={group.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{group.name}</p>
                  <Badge>{new Date(group.created_at).toLocaleDateString()}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{group.description || t('groups.noDescription')}</p>
                <p className="mt-2 truncate text-xs text-muted-foreground">{group.id}</p>
              </div>
            ))}
            {!groupsQuery.data?.length && !groupsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">{t('groups.empty')}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
