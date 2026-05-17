"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

// Minimal Accordion primitive implementing the WAI-ARIA Accordion
// pattern. The visual reveal lives in CSS (`.accordion-panel`, see
// apps/web/src/app/globals.css) so that:
//  - ARIA state (`aria-expanded`, `hidden`) is always authoritative,
//    independent of the animation;
//  - `prefers-reduced-motion` collapses the transition to instant;
//  - screen readers see the canonical open/closed state immediately.
//
// Supports the `single` and `multi` types from
// docs/design-system/components/accordion.md. `default` variant only.
// Sub-components are exposed as Accordion.Item / Trigger / Panel.

type AccordionType = "single" | "multi";

interface AccordionContextValue {
  type: AccordionType;
  openValues: Set<string>;
  toggle: (value: string) => void;
  registerTriggerId: (value: string, id: string) => void;
  registerPanelId: (value: string, id: string) => void;
  getTriggerId: (value: string) => string | undefined;
  getPanelId: (value: string) => string | undefined;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

function useAccordion(): AccordionContextValue {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) {
    throw new Error("Accordion sub-components must be rendered inside <Accordion>.");
  }
  return ctx;
}

export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: AccordionType;
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
}

const AccordionRoot = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ type = "single", defaultValue, value, onValueChange, className, children, ...props }, ref) => {
    const isControlled = value !== undefined;

    const normalize = React.useCallback((v: string | string[] | undefined): Set<string> => {
      if (!v) return new Set();
      return new Set(Array.isArray(v) ? v : [v]);
    }, []);

    const [uncontrolled, setUncontrolled] = React.useState<Set<string>>(() =>
      normalize(defaultValue)
    );

    const openValues = isControlled ? normalize(value) : uncontrolled;

    const emit = React.useCallback(
      (next: Set<string>) => {
        if (type === "single") {
          const first = Array.from(next)[0];
          onValueChange?.(first ?? "");
        } else {
          onValueChange?.(Array.from(next));
        }
      },
      [onValueChange, type]
    );

    const toggle = React.useCallback(
      (item: string) => {
        const next = new Set(openValues);
        if (next.has(item)) {
          next.delete(item);
        } else {
          if (type === "single") next.clear();
          next.add(item);
        }
        if (!isControlled) setUncontrolled(next);
        emit(next);
      },
      [openValues, type, isControlled, emit]
    );

    // ID registries so triggers and panels can cross-reference each
    // other via aria-controls / aria-labelledby without prop drilling.
    const triggerIds = React.useRef(new Map<string, string>());
    const panelIds = React.useRef(new Map<string, string>());

    const ctx = React.useMemo<AccordionContextValue>(
      () => ({
        type,
        openValues,
        toggle,
        registerTriggerId: (v, id) => {
          triggerIds.current.set(v, id);
        },
        registerPanelId: (v, id) => {
          panelIds.current.set(v, id);
        },
        getTriggerId: (v) => triggerIds.current.get(v),
        getPanelId: (v) => panelIds.current.get(v),
      }),
      [type, openValues, toggle]
    );

    return (
      <AccordionContext.Provider value={ctx}>
        <div ref={ref} className={cn("flex flex-col gap-stack-xs", className)} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    );
  }
);
AccordionRoot.displayName = "Accordion";

const ItemContext = React.createContext<{ value: string } | null>(null);

function useItem() {
  const ctx = React.useContext(ItemContext);
  if (!ctx) {
    throw new Error("Accordion.Trigger and Accordion.Panel must be inside an Accordion.Item.");
  }
  return ctx;
}

export interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, className, children, ...props }, ref) => {
    const { openValues } = useAccordion();
    const isOpen = openValues.has(value);
    const itemCtx = React.useMemo(() => ({ value }), [value]);

    return (
      <ItemContext.Provider value={itemCtx}>
        <div
          ref={ref}
          data-state={isOpen ? "open" : "closed"}
          className={cn("rounded-card border border-border-subtle bg-surface-raised", className)}
          {...props}
        >
          {children}
        </div>
      </ItemContext.Provider>
    );
  }
);
AccordionItem.displayName = "Accordion.Item";

export interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Heading level the trigger should be wrapped in. Default 3. */
  headingLevel?: 2 | 3 | 4 | 5;
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, headingLevel = 3, onClick, ...props }, ref) => {
    const { openValues, toggle, registerTriggerId, getPanelId } = useAccordion();
    const { value } = useItem();
    const isOpen = openValues.has(value);
    const reactId = React.useId();
    const triggerId = `accordion-trigger-${reactId}`;

    React.useEffect(() => {
      registerTriggerId(value, triggerId);
    }, [value, triggerId, registerTriggerId]);

    const HeadingTag = `h${headingLevel}` as "h2" | "h3" | "h4" | "h5";

    return (
      <HeadingTag className="m-0">
        <button
          ref={ref}
          id={triggerId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={getPanelId(value)}
          data-state={isOpen ? "open" : "closed"}
          onClick={(e) => {
            onClick?.(e);
            if (!e.defaultPrevented) toggle(value);
          }}
          className={cn(
            "flex w-full items-center justify-between gap-inline-md p-inset-md text-left text-base font-medium text-text-primary",
            "transition-colors duration-fast ease-standard",
            "hover:bg-surface-sunken",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:ring",
            "disabled:opacity-50 disabled:pointer-events-none",
            className
          )}
          {...props}
        >
          <span>{children}</span>
          {/* Chevron — rotates 180° when open via .icon-rotate-open
              (see globals.css). Decorative for SR; state is on
              aria-expanded above. */}
          <svg
            aria-hidden="true"
            className="icon-rotate-open h-4 w-4 shrink-0 text-text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </HeadingTag>
    );
  }
);
AccordionTrigger.displayName = "Accordion.Trigger";

export interface AccordionPanelProps extends React.HTMLAttributes<HTMLDivElement> {}

const AccordionPanel = React.forwardRef<HTMLDivElement, AccordionPanelProps>(
  ({ className, children, ...props }, ref) => {
    const { openValues, registerPanelId, getTriggerId } = useAccordion();
    const { value } = useItem();
    const isOpen = openValues.has(value);
    const reactId = React.useId();
    const panelId = `accordion-panel-${reactId}`;

    React.useEffect(() => {
      registerPanelId(value, panelId);
    }, [value, panelId, registerPanelId]);

    return (
      <div
        ref={ref}
        id={panelId}
        role="region"
        aria-labelledby={getTriggerId(value)}
        // `hidden` is the source of truth for screen-reader visibility
        // and tab order. The CSS class `.accordion-panel` handles the
        // opacity/spacing transition. Under reduced motion the
        // transition is removed; `hidden` still flips instantly.
        hidden={!isOpen}
        data-state={isOpen ? "open" : "closed"}
        className={cn("accordion-panel px-inset-md text-sm text-text-secondary", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AccordionPanel.displayName = "Accordion.Panel";

// Compound export — `<Accordion>...<Accordion.Item>...</Accordion.Item></Accordion>`.
type AccordionCompound = typeof AccordionRoot & {
  Item: typeof AccordionItem;
  Trigger: typeof AccordionTrigger;
  Panel: typeof AccordionPanel;
};

const Accordion = AccordionRoot as AccordionCompound;
Accordion.Item = AccordionItem;
Accordion.Trigger = AccordionTrigger;
Accordion.Panel = AccordionPanel;

export { Accordion };
