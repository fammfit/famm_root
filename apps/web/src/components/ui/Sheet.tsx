"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Full-screen on mobile, centered modal on desktop. */
  size?: "auto" | "tall";
}

/**
 * Mobile-first bottom sheet — slides up from the bottom on phones,
 * becomes a centered modal on wider screens.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  size = "auto",
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 animate-[fadeIn_150ms_ease-out]"
      />
      <div
        ref={panelRef}
        className={cn(
          "relative w-full sm:max-w-md bg-white",
          "rounded-t-3xl sm:rounded-3xl shadow-2xl",
          "animate-[slideUp_220ms_cubic-bezier(0.32,0.72,0,1)]",
          size === "tall" ? "max-h-[92vh]" : "max-h-[85vh]",
          "flex flex-col"
        )}
      >
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-gray-200" />
        </div>
        {title ? (
          <div className="px-5 pt-2 pb-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="h-9 w-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 touch-manipulation"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : null}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
