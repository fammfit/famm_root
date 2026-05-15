import * as React from "react";
import { cn } from "../../lib/utils";

export interface FormFieldProps {
  /** Label text — required. Decorative-only labels still belong inside a visually-hidden span. */
  label: string;
  /** Optional helper text shown below the control. Hidden when an error is present. */
  hint?: string;
  /** Error message. Renders with role="alert" and wires aria-invalid on the child. */
  error?: string;
  /**
   * Render-prop or a single child that accepts `id`, `aria-invalid`, `aria-describedby`.
   * The child is responsible for being the actual control.
   */
  children: React.ReactElement<{
    id?: string;
    "aria-invalid"?: boolean | "true" | "false";
    "aria-describedby"?: string;
  }>;
  /** Mark the field visually and via aria. */
  required?: boolean;
  /** Override the auto-generated id. */
  id?: string;
  className?: string;
}

/**
 * L2 — wires a label, a control, optional helper text, and error messaging
 * together with the right aria associations. Use this instead of bare
 * <label>+<input> in feature code. See docs/DESIGN_SYSTEM.md §5.
 */
export function FormField({
  label,
  hint,
  error,
  required,
  id,
  className,
  children,
}: FormFieldProps) {
  const generatedId = React.useId();
  const fieldId = id ?? children.props.id ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy =
    [errorId, !error ? hintId : undefined].filter(Boolean).join(" ") || undefined;

  const control = React.cloneElement(children, {
    id: fieldId,
    "aria-invalid": error ? "true" : undefined,
    "aria-describedby": describedBy,
  });

  return (
    <div className={cn("flex flex-col gap-stack-xs", className)}>
      <label
        htmlFor={fieldId}
        className="text-sm font-medium text-text-secondary"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-inline-xs text-signal-danger">
            *
          </span>
        )}
      </label>
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-signal-danger">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
