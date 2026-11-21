"use client";

import { useQuery } from "@tanstack/react-query";
import { Gauge } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/jd/api";
import { speed } from "@/lib/format";
import { keys, useAction, useToolbar } from "@/lib/queries";

import { Button } from "../ui/button";
import { Input, Switch } from "../ui/field";

const GENERAL = "org.jdownloader.settings.GeneralSettings";

/** The download speed limit: on/off and the value in KB/s, like JDownloader's toolbar. */
export function SpeedLimit() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: status } = useToolbar();
  const run = useAction();
  const enabled = Boolean(status?.limit);

  // The exact key comes from JDownloader, so a renamed setting is still found
  const { data: entries } = useQuery({
    queryKey: keys.config("speed-limit"),
    queryFn: () =>
      api.config.query({ configInterface: GENERAL, pattern: ".*SpeedLimit.*", values: true }),
    enabled: open,
  });
  const entry = entries?.find((e) => e.key.toLowerCase() === "downloadspeedlimit");
  const current = Number(entry?.value ?? status?.limitspeed ?? 0);
  // What is typed, or the current limit while nothing is
  const [draft, setDraft] = useState<string | null>(null);
  const kb = draft ?? (current ? String(Math.round(current / 1024)) : "");
  const setKb = setDraft;

  useEffect(() => {
    if (!open) return;
    const down = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", down, true);
    return () => window.removeEventListener("pointerdown", down, true);
  }, [open]);

  const save = async () => {
    const value = Math.max(1, Math.round(Number(kb) || 0)) * 1024;
    await run(
      async () => {
        await api.config.set(GENERAL, null, entry?.key ?? "DownloadSpeedLimit", value);
        if (!enabled) await api.toolbar.toggleSpeedLimit();
      },
      { success: `Límite: ${speed(value)}`, refresh: [keys.toolbar, keys.config("speed-limit")] },
    );
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <Button
        size="sm"
        variant={enabled ? "secondary" : "ghost"}
        Icon={Gauge}
        onClick={() => {
          setDraft(null);
          setOpen(!open);
        }}
        className={enabled ? "text-amber-500" : ""}
        aria-expanded={open}
      >
        <span className="max-sm:hidden">
          {enabled ? speed(status?.limitspeed ?? current) : "Sin límite"}
        </span>
      </Button>
      {open && (
        <div className="popover absolute top-full right-0 z-40 mt-2 w-64 rounded-2xl p-4">
          <div className="flex flex-col gap-3">
            <Switch
              checked={enabled}
              onChange={() => run(api.toolbar.toggleSpeedLimit, { refresh: [keys.toolbar] })}
              label="Limitar velocidad"
            />
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                save();
              }}
            >
              <Input
                type="number"
                min={1}
                value={kb}
                onChange={(event) => setKb(event.target.value)}
                aria-label="Límite en KB/s"
              />
              <span className="text-xs text-muted">KB/s</span>
              <Button type="submit" size="sm" variant="primary">
                Aplicar
              </Button>
            </form>
            <div className="flex flex-wrap gap-1.5">
              {[256, 512, 1024, 2048, 5120].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setKb(String(preset))}
                  className="rounded-full bg-track px-2 py-0.5 text-xs hover:bg-surface-hover"
                >
                  {preset >= 1024 ? `${preset / 1024} MB/s` : `${preset} KB/s`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
