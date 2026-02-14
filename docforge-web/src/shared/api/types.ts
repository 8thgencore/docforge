export type UUID = string

export interface GroupCreateRequest {
  name: string
  description?: string | null
}

export interface GroupUpdateRequest {
  name: string
  description?: string | null
}

export interface GroupResponse {
  id: UUID
  name: string
  description: string | null
  created_at: string
}

export interface GroupDocumentsClearResponse {
  group_id: UUID
  deleted_documents: number
}

export interface TagCreateRequest {
  name: string
}

export interface TagUpdateRequest {
  name: string
}

export interface TagResponse {
  id: UUID
  name: string
  created_at: string
}

export interface IngestionCreatedResponse {
  ingestion_id: UUID
  task_id: string | null
  status: IngestionStatus
}

export type IngestionStatus = 'queued' | 'running' | 'retrying' | 'failed' | 'completed'

export interface IngestionStatusResponse {
  id: UUID
  task_id: string | null
  group_id: UUID
  status: IngestionStatus
  stage: string
  progress: number
  error: string | null
  stats: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface SearchRequest {
  query: string
  group_id?: UUID | null
  tag?: string | null
  top_k?: number
}

export interface SearchHit {
  chunk_id: UUID
  document_id: UUID
  filename: string
  tag: string | null
  score: number
  text: string
}

export interface SearchResponse {
  results: SearchHit[]
}

export interface ChatRequest {
  query: string
  session_id?: string | null
  group_id?: UUID | null
  tag?: string | null
  top_k?: number
}

export interface Citation {
  document_id: UUID
  chunk_id: UUID
  filename: string
  tag: string | null
  score: number
}

export interface ChatResponse {
  answer: string
  citations: Citation[]
  insufficient_context: boolean
}

export interface DraftRequest {
  group_id: UUID
  tag: string
  prompt: string
  length?: string
  tone?: string
  format?: string
}

export interface DraftResponse {
  title: string
  sections: string[]
  citations: Citation[]
  warnings: string[]
}

export interface DocumentResponse {
  id: UUID
  group_id: UUID
  tag: string | null
  source_type: 'upload' | 'zip_upload'
  source_uri: string
  filename: string
  checksum: string
  mime_type: string | null
  language: string | null
  status: 'uploaded' | 'indexed' | 'failed'
  created_at: string
}

export interface ApiConfig {
  baseUrl: string
  apiKey: string
}
