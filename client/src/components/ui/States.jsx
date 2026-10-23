import { RefreshCw, WifiOff } from "lucide-react";

import { Button } from "./Button";

export function Card({ className = "", children, ...props }) {
  return (
    <div className={`rounded-2xl bg-surface shadow-soft ring-1 ring-line ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-ink/6 ${className}`} />;
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-line-strong px-6 py-14 text-center">
      <div className="bg-weave absolute inset-0 [mask-image:radial-gradient(circle,black,transparent_70%)]" />
      <div className="relative">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-loom-500/10 text-loom-600 ring-1 ring-loom-500/20 dark:text-loom-300">
          <Icon className="size-6" />
        </div>
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{children}</p>
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <Card className="px-6 py-12 text-center">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
        <WifiOff className="size-6" />
      </div>
      <h3 className="font-display text-lg font-bold">We couldn’t load this</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
        {error?.message ?? "Something went wrong."} Make sure the API server is running.
      </p>
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={() => onRetry()}>
          <RefreshCw /> Try again
        </Button>
      )}
    </Card>
  );
}
