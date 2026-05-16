import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-control text-sm font-medium transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-onAccent hover:bg-accent-hover focus-visible:ring",
        destructive:
          "bg-signal-danger text-onAccent hover:opacity-90 focus-visible:ring-signal-danger",
        outline:
          "border border-border bg-surface text-text-primary hover:bg-surface-sunken focus-visible:ring",
        ghost:
          "text-text-secondary hover:bg-surface-sunken hover:text-text-primary",
        link:
          "text-accent underline-offset-4 hover:underline focus-visible:ring",
        secondary:
          "bg-surface-sunken text-text-primary hover:bg-accent-subtle focus-visible:ring",
      },
      size: {
        sm: "h-8 px-inset-sm text-xs",
        md: "h-10 px-inset-md",
        lg: "h-12 px-inset-lg text-base",
        // 44×44 floor for touch (WCAG 2.2 — see DESIGN_SYSTEM.md §5).
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

function warnButtonContract(props: ButtonProps): void {
  if (process.env.NODE_ENV === "production") return;
  const { variant, size, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy } = props;
  if (variant === "destructive" && size === "sm") {
    console.warn(
      '[@famm/ui Button] variant="destructive" + size="sm" is forbidden by spec ' +
        "(docs/design-system/components/button.md §2). Use size=\"md\" or larger.",
    );
  }
  if (variant === "link" && size === "icon") {
    console.warn(
      '[@famm/ui Button] variant="link" + size="icon" is forbidden by spec ' +
        "(docs/design-system/components/button.md §2).",
    );
  }
  if (size === "icon" && !ariaLabel && !ariaLabelledBy) {
    console.warn(
      '[@famm/ui Button] size="icon" requires aria-label or aria-labelledby ' +
        "(docs/design-system/components/button.md §6).",
    );
  }
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      type = "button",
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    warnButtonContract({ variant, size, ...props });
    return (
      <button
        // Default to type="button" so a Button inside a <form> never
        // auto-submits unless the caller explicitly opts in with
        // type="submit". See button.md §10 #14.
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled ?? loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <svg
            className="mr-inline-sm h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
