"use client";

import {
  Archive,
  Download,
  Gauge,
  Link2,
  Router,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import type { ConfigEntry } from "@/lib/jd/types";
import { speed } from "@/lib/format";

import { Button } from "../ui/button";
import { Card, CardHeader, PageHeader, Spinner } from "../ui/misc";
import { ConfigEntryRow, useAllConfig } from "./config-entry";

type Setting = { iface: string; key: string; label: string; hint?: string; speed?: boolean };
type Section = { id: string; title: string; Icon: LucideIcon; settings: Setting[] };

// The everyday settings, by interface (its last part) and key. One JDownloader does not have is left out.
const SECTIONS: Section[] = [
  {
    id: "downloads",
    title: "Descargas",
    Icon: Download,
    settings: [
      {
        iface: "GeneralSettings",
        key: "DefaultDownloadFolder",
        label: "Carpeta de descargas",
        hint: "Ruta dentro del contenedor: /output es la carpeta del disco externo.",
      },
      { iface: "GeneralSettings", key: "MaxSimultaneDownloads", label: "Descargas a la vez" },
      { iface: "GeneralSettings", key: "MaxChunksPerFile", label: "Conexiones por archivo" },
      {
        iface: "GeneralSettings",
        key: "MaxSimultaneDownloadsPerHostEnabled",
        label: "Limitar descargas a la vez por host",
      },
      {
        iface: "GeneralSettings",
        key: "MaxSimultaneDownloadsPerHost",
        label: "Descargas a la vez por host",
      },
      { iface: "GeneralSettings", key: "IfFileExistsAction", label: "Si el archivo ya existe" },
      {
        iface: "GeneralSettings",
        key: "CleanupAfterDownloadAction",
        label: "Al terminar una descarga",
        hint: "Si se quita sola de la lista.",
      },
      {
        iface: "GeneralSettings",
        key: "AutoStartDownloadOption",
        label: "Empezar las descargas al arrancar",
      },
      {
        iface: "GeneralSettings",
        key: "CreateFolderTrigger",
        label: "Cuándo crear la carpeta del paquete",
      },
    ],
  },
  {
    id: "speed",
    title: "Velocidad",
    Icon: Gauge,
    settings: [
      { iface: "GeneralSettings", key: "DownloadSpeedLimitEnabled", label: "Limitar la velocidad" },
      {
        iface: "GeneralSettings",
        key: "DownloadSpeedLimit",
        label: "Límite (bytes por segundo)",
        speed: true,
      },
      {
        iface: "GeneralSettings",
        key: "PauseSpeed",
        label: "Velocidad en pausa (bytes por segundo)",
        speed: true,
      },
    ],
  },
  {
    id: "linkgrabber",
    title: "LinkGrabber",
    Icon: Link2,
    settings: [
      {
        iface: "LinkCollectorConfig",
        key: "DoLinkCheck",
        label: "Comprobar los enlaces al añadirlos",
      },
      {
        iface: "LinkgrabberSettings",
        key: "LinkgrabberAutoConfirmEnabled",
        label: "Pasar a descargas automáticamente",
      },
      {
        iface: "LinkgrabberSettings",
        key: "LinkgrabberAutoStartEnabled",
        label: "Empezar a descargar al pasarlos",
      },
      { iface: "LinkCollectorConfig", key: "DupeManagerEnabled", label: "Detectar duplicados" },
    ],
  },
  {
    id: "extraction",
    title: "Extracción",
    Icon: Archive,
    settings: [
      {
        iface: "ExtractionConfig",
        key: "DeleteArchiveFilesAfterExtractionAction",
        label: "Después de extraer, los comprimidos",
      },
      {
        iface: "ExtractionConfig",
        key: "IfFileExistsAction",
        label: "Si un archivo extraído ya existe",
      },
      { iface: "ExtractionConfig", key: "SubpathEnabled", label: "Extraer en una subcarpeta" },
      {
        iface: "ExtractionConfig",
        key: "SubPath",
        label: "Subcarpeta",
        hint: "Admite variables como %PACKAGENAME%.",
      },
      {
        iface: "ExtractionConfig",
        key: "DeleteInfoFilesAfterExtraction",
        label: "Borrar .txt y .nfo de info",
      },
      {
        iface: "ExtractionConfig",
        key: "PasswordList",
        label: "Contraseñas",
        hint: "Se prueban con cada archivo con contraseña, en orden.",
      },
    ],
  },
  {
    id: "reconnect",
    title: "Reconexión",
    Icon: Router,
    settings: [
      {
        iface: "ReconnectConfig",
        key: "AutoReconnectEnabled",
        label: "Reconectar automáticamente",
      },
      { iface: "ReconnectConfig", key: "MaxReconnectRetryNum", label: "Intentos de reconexión" },
    ],
  },
];

const norm = (value: string) => value.toLowerCase();

export function SettingsView() {
  const { data, isPending, error } = useAllConfig();

  const byKey = useMemo(() => {
    const map = new Map<string, ConfigEntry>();
    for (const entry of data ?? []) {
      map.set(`${norm(entry.interfaceName.split(".").pop() ?? "")}.${norm(entry.key)}`, entry);
    }
    return map;
  }, [data]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Ajustes"
        subtitle="Lo más usado. Todo lo demás está en Avanzado."
        actions={
          <Link href="/settings/advanced">
            <Button size="sm" Icon={SlidersHorizontal}>
              Ajustes avanzados
            </Button>
          </Link>
        }
      />
      {isPending ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted">
          <Spinner /> Leyendo los ajustes de JDownloader…
        </div>
      ) : error ? (
        <p className="text-sm text-rose-500">{error.message}</p>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {SECTIONS.map((section) => {
            const rows = section.settings
              .map((setting) => ({
                setting,
                entry: byKey.get(`${norm(setting.iface)}.${norm(setting.key)}`),
              }))
              .filter(
                (row): row is { setting: Setting; entry: ConfigEntry } => row.entry !== undefined,
              );
            if (!rows.length) return null;
            return (
              <Card key={section.id} className="scroll-mt-24 self-start overflow-hidden">
                <div id={section.id}>
                  <CardHeader title={section.title} Icon={section.Icon} />
                  <div className="border-t border-surface-border">
                    {rows.map(({ setting, entry }) => (
                      <ConfigEntryRow
                        key={`${entry.interfaceName}.${entry.key}`}
                        entry={entry}
                        label={setting.label}
                        hint={setting.hint}
                        format={setting.speed ? (value) => speed(Number(value)) : undefined}
                      />
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
