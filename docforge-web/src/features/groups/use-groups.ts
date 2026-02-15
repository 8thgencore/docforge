import { useQuery } from "@tanstack/react-query";

import { api } from "@/shared/api/client";
import { useApiConfig } from "@/shared/api/use-api-config";

export const useGroups = () => {
  const config = useApiConfig();

  return useQuery({
    queryKey: ["groups", config.baseUrl, config.apiKey],
    queryFn: () => api.listGroups(config),
    enabled: Boolean(config.apiKey),
  });
};
