import { useSettings } from "@/features/settings/settings-context";
import type { ApiConfig } from "@/shared/api/types";

export const useApiConfig = (): ApiConfig => {
  const { apiKey, baseUrl } = useSettings();
  return {
    apiKey,
    baseUrl,
  };
};
