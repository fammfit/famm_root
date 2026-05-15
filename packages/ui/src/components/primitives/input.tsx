import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            "flex h-10 w-full rounded-control border bg-surface px-inset-sm py-inset-xs text-sm text-text-primary placeholder:text-text-muted",
            "transition-colors duration-fast ease-standard",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-signal-danger focus-visible:ring-signal-danger"
              : "border-border focus-visible:ring",
            className,
          )}
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-xs text-signal-danger"
            role="alert"
          >
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-xs text-text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
