import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Input, Label } from "@/components/ui";
import { api } from "@/shared/api/client";
import { useApiConfig } from "@/shared/api/use-api-config";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { useI18n } from "@/shared/i18n/use-i18n";

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export const TagInput = ({ value, onChange, label }: TagInputProps) => {
  const config = useApiConfig();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(value.trim(), 300);

  const tagsQuery = useQuery({
    queryKey: ["tags", config.baseUrl, config.apiKey, debouncedQuery],
    queryFn: () => api.listTags(config, debouncedQuery),
    enabled: Boolean(config.apiKey),
  });

  const suggestions = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);

  return (
    <div className="grid gap-2">
      <Label htmlFor="tag-input">{label}</Label>
      <div className="relative">
        <Input
          id="tag-input"
          value={value}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          placeholder={t("tags.inputPlaceholder")}
        />
        {isOpen && suggestions.length > 0 && (
          <div className="border-border bg-background absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border shadow-md">
            {suggestions.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className="hover:bg-muted block w-full px-3 py-2 text-left text-sm"
                onClick={() => {
                  onChange(tag.name);
                  setIsOpen(false);
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
