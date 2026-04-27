"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitive.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col gap-2 p-4",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const toastVariants = {
  default: "border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100",
  success: "border-green-500 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-900/80 dark:text-green-100",
  error: "border-red-400 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-900/80 dark:text-red-100",
  warning: "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-900/80 dark:text-amber-100",
};

interface ToastProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
  variant?: keyof typeof toastVariants;
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  ToastProps
>(({ className, variant = "default", ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(
      "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-lg border p-3 shadow-lg transition-all",
      "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
      "data-[state=open]:animate-slide-in data-[state=closed]:fade-out-80",
      toastVariants[variant],
      className
    )}
    {...props}
  />
));
Toast.displayName = ToastPrimitive.Root.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn("text-xs opacity-80", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn(
      "absolute right-1 top-1 rounded p-1 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 focus:opacity-100",
      className
    )}
    {...props}
  >
    <X className="h-3 w-3" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = ToastPrimitive.Close.displayName;

// ─── Imperative toast API ─────────────────────────────────────────────────────

type ToastData = {
  id: string;
  title: string;
  description?: string;
  variant?: keyof typeof toastVariants;
};

const listeners: Array<(toasts: ToastData[]) => void> = [];
let toasts: ToastData[] = [];

function notify(update: ToastData[]) {
  toasts = update;
  listeners.forEach((l) => l(toasts));
}

export function toast(
  title: string,
  opts?: { description?: string; variant?: keyof typeof toastVariants }
) {
  const id = Math.random().toString(36).slice(2);
  notify([...toasts, { id, title, ...opts }]);
  setTimeout(() => notify(toasts.filter((t) => t.id !== id)), 4000);
}

export function Toaster() {
  const [items, setItems] = React.useState<ToastData[]>([]);

  React.useEffect(() => {
    listeners.push(setItems);
    return () => {
      const idx = listeners.indexOf(setItems);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  return (
    <ToastProvider>
      {items.map((item) => (
        <Toast key={item.id} variant={item.variant}>
          <div className="flex flex-col gap-0.5">
            <ToastTitle>{item.title}</ToastTitle>
            {item.description && (
              <ToastDescription>{item.description}</ToastDescription>
            )}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
