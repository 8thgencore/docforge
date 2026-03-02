import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button, Input, Label } from "@/components/ui";
import type { GroupResponse } from "@/shared/api/types";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { useI18n } from "@/shared/i18n/use-i18n";
import { cn } from "@/shared/lib/utils";

interface GroupSelectorProps {
  groups: GroupResponse[];
  value: string;
  onChange: (groupId: string) => void;
  allowAll?: boolean;
  hideLabel?: boolean;
  label?: string;
  openUp?: boolean;
}

export const GroupSelector = ({
  groups,
  value,
  onChange,
  allowAll = false,
  hideLabel = false,
  label,
  openUp = false,
}: GroupSelectorProps) => {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedSearch = useDebounce(search.trim().toLowerCase(), 250);
  const allGroupsLabel = t("groups.allGroups");
  const searchLabel = label ?? t("groups.searchLabel");

  const selectedGroup = useMemo(() => groups.find((group) => group.id === value), [groups, value]);
  const inputValue = isOpen ? search : (selectedGroup?.name ?? (allowAll && !value ? allGroupsLabel : search));

  const filteredGroups = useMemo(() => {
    if (!debouncedSearch) {
      return groups;
    }
    return groups.filter((group) => group.name.toLowerCase().includes(debouncedSearch));
  }, [debouncedSearch, groups]);

  const selectGroup = (groupId: string) => {
    onChange(groupId);
    setSearch("");
    setIsOpen(false);
  };

  const clearSearchAndFilter = () => {
    setSearch("");
    onChange("");
    setIsOpen(true);
  };

  const showClearButton = isOpen ? search.length > 0 : search.length > 0 || value.length > 0;

  return (
    <div className={cn("grid", hideLabel ? "gap-0" : "gap-2")}>
      {!hideLabel && <Label htmlFor="group-search">{searchLabel}</Label>}
      <div className="relative">
        <Input
          id="group-search"
          aria-label={searchLabel}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          className={cn(showClearButton && "pr-10")}
          value={inputValue}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onChange={(event) => {
            setSearch(event.target.value);
            onChange("");
            setIsOpen(true);
          }}
          placeholder={t("groups.searchPlaceholder")}
        />
        {showClearButton && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0"
            aria-label={t("groups.clearSearch")}
            title={t("groups.clearSearch")}
            onMouseDown={(event) => {
              event.preventDefault();
              clearSearchAndFilter();
            }}
          >
            <X className="size-4" />
          </Button>
        )}
        {isOpen && (
          <div
            className={cn(
              "border-border bg-background absolute z-20 max-h-56 w-full overflow-auto rounded-md border shadow-md",
              openUp ? "bottom-full mb-1" : "top-full mt-1",
            )}
          >
            {allowAll && (
              <button
                type="button"
                className={cn("hover:bg-muted block w-full px-3 py-2 text-left text-sm", !value && "bg-muted")}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectGroup("");
                }}
              >
                {allGroupsLabel}
              </button>
            )}
            {filteredGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                className={cn(
                  "hover:bg-muted block w-full px-3 py-2 text-left text-sm",
                  value === group.id && "bg-muted",
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectGroup(group.id);
                }}
              >
                {group.name}
              </button>
            ))}
            {!filteredGroups.length && (
              <p className="text-muted-foreground px-3 py-2 text-sm">{t("groups.noMatches")}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
