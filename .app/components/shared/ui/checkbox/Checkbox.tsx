"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-5 shrink-0 rounded-lg border-2 border-slate-300 bg-white shadow-sm transition-all outline-none",
        "hover:border-slate-400 hover:shadow-md",
        "focus-visible:ring-4 focus-visible:ring-amber-500/20",
        "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-600 data-[state=checked]:text-white",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "active:scale-95",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
