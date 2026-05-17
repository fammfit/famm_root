import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const cardVariants = cva(
  // Base: raised surface, hairline border, soft shadow, card radius.
  // The focus-within ring is the only visible cue that a control inside
  // an unbordered card has focus on touch viewports (card.md §5). The
  // base transitions cover the focus-within ring fade — they do NOT
  // animate any hover effect on the default variant (per the spec:
  // "non-interactive cards don't animate").
  "rounded-card border border-border-subtle bg-surface-raised shadow-sm " +
    "transition-shadow duration-fast ease-standard " +
    "focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-surface focus-within:ring",
  {
    variants: {
      variant: {
        default: "",
        // The interactive variant is for cards whose entire surface is
        // a single action target (a Card wrapping a Link). The card
        // itself never becomes a <button>; the semantics come from the
        // child Link/Button. Hover lift is gated on `motion-safe:` so
        // it collapses to no movement under
        // `prefers-reduced-motion: reduce`. The transition itself
        // remains so shadow / border cross-fade smoothly. `active`
        // returns the card to the resting position to give a tactile
        // press feedback. `focus-visible` is a backup keyboard cue for
        // consumers that make the card itself focusable (tabIndex);
        // when the card wraps a Link, the focus lands on the Link and
        // `focus-within` on the base catches it.
        interactive:
          "cursor-pointer transition duration-base ease-standard " +
          "hover:shadow-md hover:border-border-default " +
          "motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:ring",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-stack-xs p-inset-lg", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-text-primary",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-text-muted", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-inset-lg pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-inset-lg pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants };
