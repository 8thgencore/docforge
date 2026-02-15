import type { LabelHTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

export const Label = ({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => {
  return <label className={cn("text-sm font-medium", className)} {...props} />;
};
