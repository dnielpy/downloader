import type { ButtonHTMLAttributes, ComponentType } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-sky-500 text-white hover:bg-sky-400 shadow-sm shadow-sky-500/25",
  secondary: "glass hover:bg-surface-hover text-foreground",
  ghost: "text-foreground hover:bg-track",
  danger: "bg-rose-500 text-white hover:bg-rose-400",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md";
  Icon?: ComponentType<{ className?: string }>;
};

export function Button({
  variant = "secondary",
  size = "md",
  Icon,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const sizes = size === "sm" ? "h-8 px-2.5 text-xs gap-1.5" : "h-9 px-3.5 text-sm gap-2";
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-2 focus-visible:outline-sky-500 disabled:pointer-events-none disabled:opacity-45 ${sizes} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />}
      {children}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  Icon: ComponentType<{ className?: string }>;
  active?: boolean;
  tone?: "default" | "danger" | "success";
};

/** A square button with only an icon; its label is the tooltip and the accessible name. */
export function IconButton({
  label,
  Icon,
  active = false,
  tone = "default",
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  const tones = {
    default: active ? "bg-sky-500/15 text-sky-500" : "text-foreground hover:bg-track",
    danger: "text-rose-500 hover:bg-rose-500/10",
    success: "text-emerald-500 hover:bg-emerald-500/10",
  };
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      aria-pressed={active || undefined}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-sky-500 disabled:pointer-events-none disabled:opacity-40 ${tones[tone]} ${className}`}
      {...props}
    >
      <Icon className="h-4.5 w-4.5" />
    </button>
  );
}
