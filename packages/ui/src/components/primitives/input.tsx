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
          <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            // Layout — fixed dimensions; never animated.
            "flex h-10 w-full rounded-control border bg-surface px-inset-sm py-inset-xs text-sm text-text-primary placeholder:text-text-muted",
            // Animate border, background, AND box-shadow so focus and
            // error states feel responsive without moving the field.
            // duration-base (200ms) matches the rest of the system.
            // Under prefers-reduced-motion the transition is removed
            // entirely; the focus ring and error border still appear,
            // just instantly.
            "transition-[border-color,background-color,box-shadow] duration-base ease-standard motion-reduce:transition-none",
            // Subtle background lift on hover (idle, not error/disabled).
            "hover:bg-surface-default",
            // Focus ring — preserved on every state. The ring color
            // changes between idle and error via the conditional below.
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            // Disabled: no hover/focus animations (pointer-events
            // suppress hover; we also kill the transition so screen
            // recordings and reduced-motion users see a stable field).
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:transition-none disabled:hover:bg-surface",
            // Error vs idle border + ring tone.
            error
              ? "border-signal-danger focus-visible:ring-signal-danger"
              : "border-border focus-visible:ring",
            className
          )}
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-signal-danger" role="alert">
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
  }
);

Input.displayName = "Input";

export { Input };
