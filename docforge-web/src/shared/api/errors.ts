import axios from "axios";

export class ApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const details = error.response?.data;
    const detailMessage =
      typeof details === "object" && details !== null
        ? typeof (details as { detail?: unknown }).detail === "string"
          ? (details as { detail: string }).detail
          : typeof (details as { message?: unknown }).message === "string"
            ? (details as { message: string }).message
            : null
        : null;

    if (status === 401) {
      return new ApiError("Invalid API key. Check Settings.", status, details);
    }
    if (status === 404) {
      return new ApiError("Resource not found.", status, details);
    }
    if (status === 422) {
      return new ApiError("Validation failed. Check input fields.", status, details);
    }

    return new ApiError(detailMessage ?? error.message ?? "Request failed", status, details);
  }
  if (error instanceof Error) {
    return new ApiError(error.message);
  }
  return new ApiError("Unexpected error");
};
