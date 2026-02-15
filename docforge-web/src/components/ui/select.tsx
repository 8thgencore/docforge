import type { SelectHTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => {
  return (
    <select
      className={cn(
        "border-border bg-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
};
