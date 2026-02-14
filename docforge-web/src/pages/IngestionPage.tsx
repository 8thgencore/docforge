import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
} from '@/components/ui'
import { api } from '@/shared/api/client'
import { toApiError } from '@/shared/api/errors'
import { useApiConfig } from '@/shared/api/use-api-config'
import { useI18n } from '@/shared/i18n/use-i18n'

export const IngestionPage = () => {
  const config = useApiConfig()
  const { t } = useI18n()
  const [groupId, setGroupId] = useState('')
  const [category, setCategory] = useState('')
  const [ingestionId, setIngestionId] = useState('')
  const [uploadMode, setUploadMode] = useState<'files' | 'zip'>('files')
  const [files, setFiles] = useState<File[]>([])
  const [zipFile, setZipFile] = useState<File | null>(null)

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (uploadMode === 'files') {
        if (!files.length) {
          throw new Error('Select at least one file')
        }
        return api.uploadDocuments(config, groupId, files, category)
      }

      if (!zipFile) {
        throw new Error('Select a zip file')
      }

      return api.uploadZip(config, groupId, zipFile, category)
    },
    onSuccess: (data) => {
      setIngestionId(data.ingestion_id)
      toast.success(`Ingestion started: ${data.ingestion_id}`)
    },
    onError: (error) => {
      toast.error(toApiError(error).message)
    },
  })

  const statusQuery = useQuery({
    queryKey: ['ingestion-status', ingestionId, config.baseUrl, config.apiKey],
    queryFn: () => api.getIngestionStatus(config, ingestionId),
    enabled: Boolean(config.apiKey && ingestionId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status) {
        return 2500
      }
      return ['failed', 'completed'].includes(status) ? false : 2500
    },
  })

  const statusTone = useMemo(() => {
    const status = statusQuery.data?.status
    if (status === 'completed') {
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    }
    if (status === 'failed') {
      return 'bg-red-500/10 text-red-700 dark:text-red-300'
    }
    return 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
  }, [statusQuery.data?.status])

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t('ingestion.uploadTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="group-id">{t('ingestion.groupId')}</Label>
              <Input id="group-id" value={groupId} onChange={(event) => setGroupId(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">{t('ingestion.category')}</Label>
              <Input id="category" value={category} onChange={(event) => setCategory(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mode">{t('ingestion.mode')}</Label>
              <Select
                id="mode"
                value={uploadMode}
                onChange={(event) => setUploadMode(event.target.value as 'files' | 'zip')}
              >
                <option value="files">{t('ingestion.files')}</option>
                <option value="zip">{t('ingestion.zip')}</option>
              </Select>
            </div>
            {uploadMode === 'files' ? (
              <Input
                type="file"
                multiple
                onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              />
            ) : (
              <Input type="file" accept=".zip" onChange={(event) => setZipFile(event.target.files?.[0] ?? null)} />
            )}
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending || !groupId || !config.apiKey}
            >
              {uploadMutation.isPending ? t('ingestion.uploading') : t('ingestion.start')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('ingestion.statusTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ingestion-id">Ingestion ID</Label>
              <Input
                id="ingestion-id"
                value={ingestionId}
                onChange={(event) => setIngestionId(event.target.value)}
              />
            </div>

            {!ingestionId && <p className="text-sm text-muted-foreground">{t('ingestion.enterId')}</p>}

            {statusQuery.data && (
              <div className="space-y-2 rounded-md border border-border p-3">
                <Badge className={statusTone}>{statusQuery.data.status}</Badge>
                <p className="text-sm">
                  {t('ingestion.stage')}: {statusQuery.data.stage}
                </p>
                <p className="text-sm">
                  {t('ingestion.progress')}: {Math.round(statusQuery.data.progress * 100)}%
                </p>
                {statusQuery.data.error && (
                  <p className="text-sm text-destructive">
                    {t('ingestion.error')}: {statusQuery.data.error}
                  </p>
                )}
                {statusQuery.data.stats && (
                  <pre className="overflow-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(statusQuery.data.stats, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {statusQuery.isError && <p className="text-sm text-destructive">{toApiError(statusQuery.error).message}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
