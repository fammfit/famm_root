import * as React from "react";
import { cn } from "@/lib/cn";

type Edge = "top" | "bottom" | "left" | "right";

interface SafeAreaInsetProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Which edges should respect the device inset. Default: all. */
  edges?: ReadonlyArray<Edge>;
  /** Render as a different tag (header, footer, nav…). */
  as?: "div" | "header" | "footer" | "nav" | "main" | "section";
  children?: React.ReactNode;
}

const EDGE_CLASS: Record<Edge, string> = {
  top: "pt-[env(safe-area-inset-top)]",
  bottom: "pb-[env(safe-area-inset-bottom)]",
  left: "pl-[env(safe-area-inset-left)]",
  right: "pr-[env(safe-area-inset-right)]",
};

/**
 * Adds device safe-area padding to its children. Required wrapper for any
 * surface that touches the screen edges (AppBar at top, BottomTabBar at
 * bottom). Costs nothing on devices without a notch / home indicator.
 */
export function SafeAreaInset({
  edges = ["top", "bottom", "left", "right"],
  as: Tag = "div",
  className,
  children,
  ...rest
}: SafeAreaInsetProps) {
  const insetClasses = edges.map((edge) => EDGE_CLASS[edge]).join(" ");
  return (
    <Tag className={cn(insetClasses, className)} {...rest}>
      {children}
    </Tag>
  );
}
