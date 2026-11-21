"use client";

import {
  Crown,
  Ellipsis,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Router,
  Square,
  StepForward,
} from "lucide-react";
import { useState } from "react";

import { api } from "@/lib/jd/api";
import { keys, useAction, useToolbar } from "@/lib/queries";

import { useAddLinks } from "../add-links";
import { Button, IconButton } from "../ui/button";
import { Menu } from "../ui/menu";
import { SpeedLimit } from "./speed-limit";

/** Start, pause and stop for every download, plus the toggles of JDownloader's toolbar. */
export function Toolbar() {
  const { data: status } = useToolbar();
  const run = useAction();
  const addLinks = useAddLinks();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const running = Boolean(status?.running) || status?.state === "RUNNING";
  const paused = Boolean(status?.pause) || status?.state === "PAUSE";
  const refresh = { refresh: [keys.toolbar, keys.downloads] };

  return (
    <div className="flex items-center gap-1">
      <IconButton
        label="Iniciar descargas"
        Icon={Play}
        tone="success"
        active={running && !paused}
        onClick={() => run(api.controller.start, refresh)}
        className={running && !paused ? "bg-emerald-500/15" : ""}
      />
      <IconButton
        label={paused ? "Reanudar" : "Pausar"}
        Icon={Pause}
        active={paused}
        disabled={!running && !paused}
        onClick={() => run(() => api.controller.pause(!paused), refresh)}
      />
      <IconButton
        label="Detener descargas"
        Icon={Square}
        tone="danger"
        disabled={!running}
        onClick={() => run(api.controller.stop, refresh)}
      />
      <div className="mx-1 h-6 w-px bg-surface-border" />
      <SpeedLimit />
      <IconButton
        label="Más acciones"
        Icon={Ellipsis}
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          setMenu({ x: box.right - 220, y: box.bottom + 6 });
        }}
      />
      <Button variant="primary" Icon={Plus} onClick={() => addLinks()} className="ml-1">
        <span className="max-sm:hidden">Añadir enlaces</span>
      </Button>
      {menu && (
        <Menu
          at={menu}
          onClose={() => setMenu(null)}
          items={[
            {
              label: "Parar tras las descargas actuales",
              Icon: StepForward,
              hint: status?.stopafter ? "Activo" : undefined,
              onSelect: () => run(api.toolbar.toggleStopAfterCurrent, { refresh: [keys.toolbar] }),
            },
            {
              label: "Reconexión automática",
              Icon: Router,
              hint: status?.reconnect ? "Activa" : "Apagada",
              onSelect: () => run(api.toolbar.toggleReconnect, { refresh: [keys.toolbar] }),
            },
            {
              label: "Usar cuentas premium",
              Icon: Crown,
              hint: status?.premium === false ? "Apagado" : "Activo",
              onSelect: () => run(api.toolbar.togglePremium, { refresh: [keys.toolbar] }),
            },
            "separator",
            {
              label: "Reconectar ahora",
              Icon: RefreshCw,
              onSelect: () => run(api.reconnect, { success: "Reconexión pedida" }),
            },
          ]}
        />
      )}
    </div>
  );
}
