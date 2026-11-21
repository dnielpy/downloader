import type { ComponentType, ReactNode } from "react";

/** The title row of a page, with its actions on the right. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted tabular-nums">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`glass rounded-3xl ${className}`}>{children}</section>;
}

export function CardHeader({
  title,
  Icon,
  actions,
}: {
  title: string;
  Icon?: ComponentType<{ className?: string }>;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
      <h2 className="flex items-center gap-2.5 font-semibold tracking-tight">
        {Icon && (
          <span className="bg-accent-soft flex h-7 w-7 items-center justify-center rounded-lg text-sky-500">
            <Icon className="h-4 w-4" />
          </span>
        )}
        {title}
      </h2>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** What a list shows when it has nothing. */
export function Empty({
  Icon,
  title,
  children,
}: {
  Icon: ComponentType<{ className?: string }>;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <span className="bg-accent-soft mb-1 flex h-12 w-12 items-center justify-center rounded-2xl text-sky-500">
        <Icon className="h-6 w-6" />
      </span>
      <p className="font-medium">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "bg-track text-muted",
    success: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    danger: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
    info: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** A thin progress bar; null value means unknown size. */
export function Progress({
  value,
  active,
  tone = "sky",
}: {
  value: number | null;
  active?: boolean;
  tone?: "sky" | "emerald" | "rose" | "muted";
}) {
  const fills = {
    sky: "bg-sky-500",
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    muted: "bg-muted/50",
  };
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-track"
      role="progressbar"
      aria-valuenow={value ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 ${fills[tone]} ${active ? "shimmer" : ""}`}
        style={{ width: `${value ?? 0}%` }}
      />
    </div>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent opacity-70 ${className}`}
    />
  );
}
