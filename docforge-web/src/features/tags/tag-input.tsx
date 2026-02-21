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
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          placeholder={t("tags.inputPlaceholder")}
        />
        {isOpen && (
          <div className="border-border bg-background absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border shadow-md">
            {suggestions.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className="hover:bg-muted block w-full px-3 py-2 text-left text-sm"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(tag.name);
                  setIsOpen(false);
                }}
              >
                {tag.name}
              </button>
            ))}
            {!suggestions.length && <p className="text-muted-foreground px-3 py-2 text-sm">{t("tags.empty")}</p>}
          </div>
        )}
      </div>
    </div>
  );
};
