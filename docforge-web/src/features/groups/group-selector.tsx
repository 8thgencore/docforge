import { useMemo, useState } from 'react'

import { Input, Label } from '@/components/ui'
import type { GroupResponse } from '@/shared/api/types'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useI18n } from '@/shared/i18n/use-i18n'

interface GroupSelectorProps {
  groups: GroupResponse[]
  value: string
  onChange: (groupId: string) => void
  allowAll?: boolean
}

export const GroupSelector = ({ groups, value, onChange, allowAll = false }: GroupSelectorProps) => {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const debouncedSearch = useDebounce(search.trim().toLowerCase(), 250)

  const selectedGroup = useMemo(() => groups.find((group) => group.id === value), [groups, value])
  const inputValue = isOpen ? search : selectedGroup?.name ?? search

  const filteredGroups = useMemo(() => {
    if (!debouncedSearch) {
      return groups
    }
    return groups.filter((group) => group.name.toLowerCase().includes(debouncedSearch))
  }, [debouncedSearch, groups])

  return (
    <div className="grid gap-2">
      <Label htmlFor="group-search">{t('groups.searchLabel')}</Label>
      <div className="relative">
        <Input
          id="group-search"
          value={inputValue}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120)
          }}
          onChange={(event) => {
            setSearch(event.target.value)
            onChange('')
            setIsOpen(true)
          }}
          placeholder={t('groups.searchPlaceholder')}
        />
        {isOpen && (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-background shadow-md">
            {allowAll && (
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onChange('')
                  setSearch('')
                  setIsOpen(false)
                }}
              >
                {t('groups.allGroups')}
              </button>
            )}
            {filteredGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onChange(group.id)
                  setSearch(group.name)
                  setIsOpen(false)
                }}
              >
                {group.name}
              </button>
            ))}
            {!filteredGroups.length && (
              <p className="px-3 py-2 text-sm text-muted-foreground">{t('groups.noMatches')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
