import type { HTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

export const Badge = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "border-border inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase",
        className,
      )}
      {...props}
    />
  );
};
