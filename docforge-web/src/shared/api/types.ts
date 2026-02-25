export type UUID = string;

export interface GroupCreateRequest {
  name: string;
  description?: string | null;
}

export interface GroupUpdateRequest {
  name: string;
  description?: string | null;
}

export interface GroupResponse {
  id: UUID;
  name: string;
  description: string | null;
  created_at: string;
}

export interface GroupDocumentsClearResponse {
  group_id: UUID;
  deleted_documents: number;
}

export interface IngestionCreatedResponse {
  ingestion_id: UUID;
  task_id: string | null;
  status: IngestionStatus;
}

export type IngestionStatus = "queued" | "running" | "retrying" | "paused" | "failed" | "completed";

export interface IngestionStatusResponse {
  id: UUID;
  task_id: string | null;
  filename: string | null;
  group_id: UUID;
  status: IngestionStatus;
  stage: string;
  progress: number;
  error: string | null;
  stats: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SearchRequest {
  query: string;
  group_id?: UUID | null;
  top_k?: number;
}

export interface SearchChunkHit {
  chunk_id: UUID;
  score: number;
  text: string;
}

export interface SearchHit {
  document_id: UUID;
  group_id: UUID | null;
  group_name: string | null;
  created_at: string | null;
  filename: string;
  score: number;
  chunks: SearchChunkHit[];
}

export interface SearchResponse {
  results: SearchHit[];
}

export interface ChatRequest {
  query: string;
  session_id?: string | null;
  group_id?: UUID | null;
  top_k?: number;
}

export interface Citation {
  document_id: UUID;
  chunk_id: UUID;
  filename: string;
  score: number;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  insufficient_context: boolean;
}

export interface DraftRequest {
  group_id: UUID;
  prompt: string;
  length?: string;
  tone?: string;
  format?: string;
}

export interface DraftResponse {
  title: string;
  sections: string[];
  citations: Citation[];
  warnings: string[];
}

export interface DocumentResponse {
  id: UUID;
  group_id: UUID;
  source_type: "upload" | "zip_upload";
  source_uri: string;
  filename: string;
  checksum: string;
  mime_type: string | null;
  language: string | null;
  status: "uploaded" | "indexed" | "failed";
  created_at: string;
}

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
}

export interface EmbeddingHealthResponse {
  status: "ok" | "degraded";
  provider: string;
  message: string;
  checked_at: string;
  details?: Record<string, unknown> | null;
}
