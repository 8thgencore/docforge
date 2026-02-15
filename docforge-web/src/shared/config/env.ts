export const env = {
  defaultApiBaseUrl: import.meta.env.VITE_DOCFORGE_API_BASE_URL ?? "http://localhost:8300/v1",
} as const;
