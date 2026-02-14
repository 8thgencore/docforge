import axios, { type AxiosRequestConfig } from 'axios'

import { ApiError, toApiError } from '@/shared/api/errors'
import type {
  ApiConfig,
  ChatRequest,
  ChatResponse,
  DocumentResponse,
  DraftRequest,
  DraftResponse,
  GroupCreateRequest,
  GroupResponse,
  IngestionCreatedResponse,
  IngestionStatusResponse,
  SearchRequest,
  SearchResponse,
} from '@/shared/api/types'

const request = async <T>(
  config: ApiConfig,
  endpoint: string,
  options: AxiosRequestConfig = {},
): Promise<T> => {
  if (!config.apiKey.trim()) {
    throw new ApiError('Missing API key. Configure it in Settings.')
  }

  try {
    const response = await axios.request<T>({
      baseURL: config.baseUrl,
      url: endpoint,
      headers: {
        'X-API-Key': config.apiKey,
        ...options.headers,
      },
      ...options,
    })

    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export const api = {
  createGroup: (config: ApiConfig, payload: GroupCreateRequest) =>
    request<GroupResponse>(config, '/groups', { method: 'POST', data: payload }),

  listGroups: (config: ApiConfig) => request<GroupResponse[]>(config, '/groups'),

  uploadDocuments: (config: ApiConfig, groupId: string, files: File[], category?: string) => {
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }
    if (category?.trim()) {
      formData.append('category', category)
    }
    return request<IngestionCreatedResponse>(config, `/groups/${groupId}/ingestions/upload`, {
      method: 'POST',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  uploadZip: (config: ApiConfig, groupId: string, archive: File, category?: string) => {
    const formData = new FormData()
    formData.append('archive', archive)
    if (category?.trim()) {
      formData.append('category', category)
    }
    return request<IngestionCreatedResponse>(config, `/groups/${groupId}/ingestions/zip`, {
      method: 'POST',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getIngestionStatus: (config: ApiConfig, ingestionId: string) =>
    request<IngestionStatusResponse>(config, `/ingestions/${ingestionId}`),

  search: (config: ApiConfig, payload: SearchRequest) =>
    request<SearchResponse>(config, '/search', { method: 'POST', data: payload }),

  chat: (config: ApiConfig, payload: ChatRequest) =>
    request<ChatResponse>(config, '/chat', { method: 'POST', data: payload }),

  generateDraft: (config: ApiConfig, payload: DraftRequest) =>
    request<DraftResponse>(config, '/drafts/generate', { method: 'POST', data: payload }),

  getDocument: (config: ApiConfig, documentId: string) =>
    request<DocumentResponse>(config, `/documents/${documentId}`),

  health: (config: ApiConfig) => request<{ status: string }>(config, '/health'),
}
