import { useMemo, useState } from "react";

import { Input, Label } from "@/components/ui";
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
  openUp?: boolean;
}

export const GroupSelector = ({
  groups,
  value,
  onChange,
  allowAll = false,
  hideLabel = false,
  openUp = false,
}: GroupSelectorProps) => {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedSearch = useDebounce(search.trim().toLowerCase(), 250);
  const allGroupsLabel = t("groups.allGroups");
  const searchLabel = t("groups.searchLabel");

  const selectedGroup = useMemo(() => groups.find((group) => group.id === value), [groups, value]);
  const inputValue = isOpen ? search : (selectedGroup?.name ?? (allowAll && !value ? allGroupsLabel : search));

  const filteredGroups = useMemo(() => {
    if (!debouncedSearch) {
      return groups;
    }
    return groups.filter((group) => group.name.toLowerCase().includes(debouncedSearch));
  }, [debouncedSearch, groups]);

  const selectGroup = (groupId: string, groupName = "") => {
    onChange(groupId);
    setSearch(groupName);
    setIsOpen(false);
  };

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
                  selectGroup(group.id, group.name);
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
