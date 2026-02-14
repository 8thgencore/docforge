import type { SelectHTMLAttributes } from 'react'

import { cn } from '@/shared/lib/utils'

export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
      {...props}
    />
  )
}
