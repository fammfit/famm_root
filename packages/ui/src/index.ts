// Primitives (L1)
export { Button, buttonVariants } from "./components/primitives/button";
export type { ButtonProps } from "./components/primitives/button";

export { Input } from "./components/primitives/input";
export type { InputProps } from "./components/primitives/input";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
} from "./components/primitives/card";
export type { CardProps } from "./components/primitives/card";

export { Badge, badgeVariants } from "./components/primitives/badge";
export type { BadgeProps } from "./components/primitives/badge";

export { Spinner } from "./components/primitives/spinner";

// Patterns (L2)
export { FormField } from "./components/patterns/form-field";
export type { FormFieldProps } from "./components/patterns/form-field";

export { StatCard } from "./components/patterns/stat-card";
export type { StatCardProps } from "./components/patterns/stat-card";

export { SessionTimer } from "./components/patterns/session-timer";
export type { SessionTimerProps } from "./components/patterns/session-timer";

// Hooks
export { useReducedMotion } from "./hooks/use-reduced-motion";

// Tokens (non-CSS contexts only — prefer Tailwind utilities)
export { tokens } from "./tokens/tokens";
export type { Tokens, ThemeName } from "./tokens/tokens";

// Utilities
export { cn } from "./lib/utils";
