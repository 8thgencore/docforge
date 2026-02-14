import axios from 'axios'

export class ApiError extends Error {
  status?: number
  details?: unknown

  constructor(message: string, status?: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export const toApiError = (error: unknown): ApiError => {
  if (!axios.isAxiosError(error)) {
    return new ApiError('Unexpected error')
  }

  const status = error.response?.status
  const details = error.response?.data

  if (status === 401) {
    return new ApiError('Invalid API key. Check Settings.', status, details)
  }
  if (status === 404) {
    return new ApiError('Resource not found.', status, details)
  }
  if (status === 422) {
    return new ApiError('Validation failed. Check input fields.', status, details)
  }

  return new ApiError(error.message || 'Request failed', status, details)
}
