import * as React from "react";
import { cn } from "@/lib/cn";

export function OnboardingStepBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      id="main"
      className={cn(
        "mx-auto flex w-full max-w-3xl flex-1 flex-col gap-stack-md px-inset-md py-stack-md",
        className
      )}
    >
      {children}
    </main>
  );
}
