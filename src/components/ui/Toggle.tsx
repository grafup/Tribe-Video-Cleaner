"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

interface ToggleProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  label?: string;
  description?: string;
}

const Toggle = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  ToggleProps
>(({ className, label, description, ...props }, ref) => (
  <div className="flex items-center justify-between gap-3">
    {(label || description) && (
      <div className="flex flex-col">
        {label && (
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
        )}
        {description && (
          <span className="text-xs text-gray-500">{description}</span>
        )}
      </div>
    )}
    <SwitchPrimitives.Root
      ref={ref}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        "data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
          "data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitives.Root>
  </div>
));
Toggle.displayName = "Toggle";

export { Toggle };
