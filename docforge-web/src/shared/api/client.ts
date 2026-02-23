import axios, { type AxiosRequestConfig } from "axios";

import { ApiError, toApiError } from "@/shared/api/errors";
import type {
  ApiConfig,
  ChatRequest,
  ChatResponse,
  DocumentResponse,
  EmbeddingHealthResponse,
  DraftRequest,
  DraftResponse,
  GroupCreateRequest,
  GroupDocumentsClearResponse,
  GroupResponse,
  GroupUpdateRequest,
  IngestionCreatedResponse,
  IngestionStatusResponse,
  SearchRequest,
  SearchResponse,
} from "@/shared/api/types";

const request = async <T>(config: ApiConfig, endpoint: string, options: AxiosRequestConfig = {}): Promise<T> => {
  if (!config.apiKey.trim()) {
    throw new ApiError("Missing API key. Configure it in Settings.");
  }

  try {
    const extraHeaders = (options.headers ?? {}) as Record<string, string>;

    const response = await axios.request<T>({
      baseURL: config.baseUrl,
      url: endpoint,
      ...options,
      headers: {
        ...extraHeaders,
        "X-API-Key": config.apiKey,
      },
    });

    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const api = {
  createGroup: (config: ApiConfig, payload: GroupCreateRequest) =>
    request<GroupResponse>(config, "/groups", {
      method: "POST",
      data: payload,
    }),

  listGroups: (config: ApiConfig) => request<GroupResponse[]>(config, "/groups"),

  updateGroup: (config: ApiConfig, groupId: string, payload: GroupUpdateRequest) =>
    request<GroupResponse>(config, `/groups/${groupId}`, {
      method: "PATCH",
      data: payload,
    }),

  clearGroupDocuments: (config: ApiConfig, groupId: string) =>
    request<GroupDocumentsClearResponse>(config, `/groups/${groupId}/documents`, { method: "DELETE" }),

  deleteGroup: (config: ApiConfig, groupId: string) =>
    request<void>(config, `/groups/${groupId}`, { method: "DELETE" }),

  uploadDocuments: (config: ApiConfig, groupId: string, files: File[]) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    return request<IngestionCreatedResponse>(config, `/groups/${groupId}/ingestions/upload`, {
      method: "POST",
      data: formData,
    });
  },

  uploadZip: (config: ApiConfig, groupId: string, archive: File) => {
    const formData = new FormData();
    formData.append("archive", archive);
    return request<IngestionCreatedResponse>(config, `/groups/${groupId}/ingestions/zip`, {
      method: "POST",
      data: formData,
    });
  },

  getIngestionStatus: (config: ApiConfig, ingestionId: string) =>
    request<IngestionStatusResponse>(config, `/ingestions/${ingestionId}`),

  listIngestions: (config: ApiConfig, groupId?: string) =>
    request<IngestionStatusResponse[]>(config, "/ingestions", {
      params: groupId ? { group_id: groupId, limit: 50 } : { limit: 50 },
    }),

  pauseIngestion: (config: ApiConfig, ingestionId: string) =>
    request<IngestionStatusResponse>(config, `/ingestions/${ingestionId}/pause`, { method: "POST" }),

  search: (config: ApiConfig, payload: SearchRequest) =>
    request<SearchResponse>(config, "/search", {
      method: "POST",
      data: payload,
    }),

  chat: (config: ApiConfig, payload: ChatRequest) =>
    request<ChatResponse>(config, "/chat", { method: "POST", data: payload }),

  generateDraft: (config: ApiConfig, payload: DraftRequest) =>
    request<DraftResponse>(config, "/drafts/generate", {
      method: "POST",
      data: payload,
    }),

  getDocument: (config: ApiConfig, documentId: string) => request<DocumentResponse>(config, `/documents/${documentId}`),

  health: (config: ApiConfig) => request<{ status: string }>(config, "/health"),

  healthEmbedding: (config: ApiConfig) => request<EmbeddingHealthResponse>(config, "/health/embedding"),
};
