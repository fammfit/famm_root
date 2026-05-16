export default function OnboardingFlowLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-stack-md px-inset-md py-stack-md">
      <div className="h-6 w-32 animate-pulse rounded-pill bg-surface-sunken" />
      <div className="h-9 w-2/3 animate-pulse rounded-control bg-surface-sunken" />
      <div className="h-40 animate-pulse rounded-card bg-surface-sunken" />
    </div>
  );
}
