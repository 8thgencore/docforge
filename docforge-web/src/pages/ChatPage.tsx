import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from '@/components/ui'
import { api } from '@/shared/api/client'
import { toApiError } from '@/shared/api/errors'
import type { ChatResponse } from '@/shared/api/types'
import { useApiConfig } from '@/shared/api/use-api-config'
import { useI18n } from '@/shared/i18n/use-i18n'

export const ChatPage = () => {
  const config = useApiConfig()
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [groupId, setGroupId] = useState('')
  const [category, setCategory] = useState('')
  const [response, setResponse] = useState<ChatResponse | null>(null)

  const chatMutation = useMutation({
    mutationFn: () =>
      api.chat(config, {
        query,
        group_id: groupId || undefined,
        category: category || undefined,
      }),
    onSuccess: (data) => {
      setResponse(data)
    },
    onError: (error) => {
      toast.error(toApiError(error).message)
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('chat.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="group-id">{t('search.groupId')}</Label>
              <Input id="group-id" value={groupId} onChange={(event) => setGroupId(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">{t('search.category')}</Label>
              <Input id="category" value={category} onChange={(event) => setCategory(event.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="chat-query">{t('chat.question')}</Label>
            <Textarea
              id="chat-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Summarize SLA obligations in the uploaded contracts"
            />
          </div>

          <div>
            <Button disabled={!query || !config.apiKey || chatMutation.isPending} onClick={() => chatMutation.mutate()}>
              {chatMutation.isPending ? t('chat.loading') : t('chat.action')}
            </Button>
          </div>

          {response && (
            <div className="space-y-3 rounded-md border border-border p-4">
              {response.insufficient_context && (
                <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                  {t('chat.insufficient')}
                </p>
              )}
              <p className="whitespace-pre-wrap text-sm leading-6">{response.answer}</p>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('chat.citations')}</p>
                {response.citations.map((citation) => (
                  <div key={citation.chunk_id} className="rounded border border-border p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge>{citation.score.toFixed(3)}</Badge>
                      <span>{citation.filename}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">chunk: {citation.chunk_id}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
