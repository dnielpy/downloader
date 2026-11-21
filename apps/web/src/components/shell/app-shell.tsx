"use client";

import {
  Archive,
  CloudDownload,
  Download,
  HardDrive,
  KeyRound,
  Link2,
  Moon,
  Server,
  Settings,
  ShieldQuestion,
  SlidersHorizontal,
  Sun,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";

import { bytes, enumLabel, speed } from "@/lib/format";
import { isOffline, useCaptchas, useStorage, useToolbar } from "@/lib/queries";

import { CaptchaNotifier } from "../captchas/captchas-view";
import { Spinner } from "../ui/misc";
import { Toolbar } from "./toolbar";

const NAV = [
  { href: "/downloads", label: "Descargas", Icon: Download },
  { href: "/linkgrabber", label: "LinkGrabber", Icon: Link2 },
  { href: "/captchas", label: "Captchas", Icon: ShieldQuestion },
  { href: "/accounts", label: "Cuentas", Icon: KeyRound },
  { href: "/extraction", label: "Extracción", Icon: Archive },
  { href: "/settings", label: "Ajustes", Icon: Settings },
  { href: "/settings/advanced", label: "Avanzado", Icon: SlidersHorizontal },
  { href: "/system", label: "Sistema", Icon: Server },
];

function useActive() {
  const pathname = usePathname();
  // The longest matching entry wins, so /settings/advanced does not also light up /settings
  const match = NAV.filter((n) => pathname === n.href || pathname.startsWith(`${n.href}/`)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
  return match?.href;
}

export function AppShell({ children }: { children: ReactNode }) {
  const active = useActive();
  const { data: captchas } = useCaptchas();
  const { error } = useToolbar();
  const pending = captchas?.length ?? 0;

  return (
    <div className="flex min-h-dvh">
      <CaptchaNotifier />
      <div className="aurora" aria-hidden>
        <span />
        <span />
      </div>

      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-1 border-r border-surface-border p-3 lg:flex">
        <Link href="/downloads" className="mb-4 flex items-center gap-2.5 px-2 pt-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 text-white shadow-lg shadow-sky-500/25">
            <CloudDownload className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-semibold tracking-tight">Downloader</span>
            <span className="block text-xs text-muted">JDownloader 2</span>
          </span>
        </Link>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active === href ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors ${
                active === href
                  ? "bg-sky-500/12 font-medium text-sky-600 dark:text-sky-400"
                  : "text-muted hover:bg-track hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {href === "/captchas" && pending > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white">
                  {pending}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-surface-border bg-background/70 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 lg:px-6">
            <Link href="/downloads" className="flex items-center gap-2 lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 text-white">
                <CloudDownload className="h-4.5 w-4.5" />
              </span>
            </Link>
            <div className="hidden lg:block" />
            <Toolbar />
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
            {NAV.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={active === href ? "page" : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
                  active === href
                    ? "bg-sky-500/15 font-medium text-sky-600 dark:text-sky-400"
                    : "text-muted hover:bg-track"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {href === "/captchas" && pending > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">
                    {pending}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </header>

        {isOffline(error) && (
          <div className="flex items-center gap-2.5 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 lg:px-6 dark:text-amber-300">
            <WifiOff className="h-4 w-4 shrink-0" />
            JDownloader no responde: está arrancando, reiniciándose o actualizándose. Reintentando…
            <Spinner className="ml-auto h-3.5 w-3.5" />
          </div>
        )}

        <main className="flex-1 px-4 py-5 lg:px-6">{children}</main>
        <StatusBar />
      </div>
    </div>
  );
}

const STATES: Record<string, string> = {
  RUNNING: "Descargando",
  IDLE: "En espera",
  PAUSE: "En pausa",
  STOPPING: "Deteniendo",
  STOPPED_STATE: "Detenido",
};

function StatusBar() {
  const { data: status, error } = useToolbar();
  const { data: storage } = useStorage();
  const { resolvedTheme, setTheme } = useTheme();
  const disk = storage?.[0];
  const state = status?.state ? (STATES[status.state] ?? enumLabel(status.state)) : null;
  const offline = isOffline(error);

  return (
    <footer className="sticky bottom-0 z-20 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-surface-border bg-background/75 px-4 py-2 text-xs text-muted backdrop-blur-xl lg:px-6">
      <span className="flex items-center gap-1.5">
        <span
          className={`h-2 w-2 rounded-full ${offline ? "bg-rose-500" : status?.state === "RUNNING" ? "animate-pulse bg-emerald-500" : "bg-muted/60"}`}
        />
        {offline ? "Sin conexión con JDownloader" : (state ?? "Conectando…")}
      </span>
      <span className="flex items-center gap-1.5 tabular-nums">
        <Download className="h-3.5 w-3.5" />
        {speed(status?.speed)}
        {status?.limit ? (
          <span className="text-amber-500">(límite {speed(status.limitspeed)})</span>
        ) : null}
      </span>
      {disk && !disk.error && (
        <span className="flex items-center gap-1.5 tabular-nums" title={disk.path}>
          <HardDrive className="h-3.5 w-3.5" />
          {bytes(disk.free)} libres de {bytes(disk.size)}
        </span>
      )}
      <button
        type="button"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className="ml-auto flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 hover:bg-track hover:text-foreground"
        aria-label="Cambiar tema"
      >
        {/* By CSS: the theme is unknown while rendering on the server */}
        <Sun className="hidden h-3.5 w-3.5 dark:block" />
        <Moon className="h-3.5 w-3.5 dark:hidden" />
        Tema
      </button>
    </footer>
  );
}
