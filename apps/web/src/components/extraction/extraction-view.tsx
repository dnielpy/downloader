"use client";

import { useQuery } from "@tanstack/react-query";
import { Archive, KeyRound, Plus, Settings, X } from "lucide-react";
import Link from "next/link";

import { api } from "@/lib/jd/api";
import type { ArchiveStatus } from "@/lib/jd/types";
import { enumLabel } from "@/lib/format";
import { keys, useAction } from "@/lib/queries";

import { Button, IconButton } from "../ui/button";
import { Badge, Card, CardHeader, Empty, PageHeader, Spinner } from "../ui/misc";
import { usePrompt } from "../ui/prompt";

function StatusBadge({ archive }: { archive: ArchiveStatus }) {
  switch (archive.controllerStatus) {
    case "RUNNING":
      return (
        <Badge tone="info">
          <Spinner className="h-2.5 w-2.5" /> Extrayendo
        </Badge>
      );
    case "QUEUED":
      return <Badge tone="warning">En cola</Badge>;
    default:
      return <Badge>Esperando</Badge>;
  }
}

export function ExtractionView() {
  const run = useAction();
  const { prompt } = usePrompt();
  const { data: queue, isPending } = useQuery({
    queryKey: keys.extraction,
    queryFn: api.extraction.queue,
    refetchInterval: 2000,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Extracción"
        subtitle="Archivos comprimidos que JDownloader descomprime al terminar de bajar"
        actions={
          <>
            <Link href="/settings#extraction">
              <Button size="sm" Icon={Settings}>
                Ajustes de extracción
              </Button>
            </Link>
            <Button
              size="sm"
              variant="primary"
              Icon={KeyRound}
              onClick={async () => {
                const password = await prompt({
                  title: "Añadir contraseña",
                  label: "Se probará con todos los archivos con contraseña",
                  confirm: "Añadir",
                });
                if (password?.trim()) {
                  await run(() => api.extraction.addPassword(password.trim()), {
                    refresh: [["config"]],
                    success: "Contraseña añadida a la lista",
                  });
                }
              }}
            >
              Añadir contraseña
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader title="Cola" Icon={Archive} />
        {isPending ? (
          <div className="flex items-center gap-2 px-5 pb-5 text-sm text-muted">
            <Spinner /> Cargando…
          </div>
        ) : !queue?.length ? (
          <Empty Icon={Archive} title="Nada que extraer ahora">
            Cuando termine de bajar un archivo comprimido (rar, zip, 7z…) aparecerá aquí mientras se
            extrae. Para extraer algo ya descargado: en Descargas, menú del paquete → Extraer ahora.
          </Empty>
        ) : (
          <ul>
            {queue.map((archive) => (
              <li
                key={archive.archiveId}
                className="flex items-center gap-3 border-t border-surface-border px-5 py-3 text-sm"
              >
                <Archive className="h-4 w-4 shrink-0 text-sky-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{archive.archiveName}</p>
                  {archive.type && <p className="text-xs text-muted">{enumLabel(archive.type)}</p>}
                </div>
                <StatusBadge archive={archive} />
                {archive.controllerId !== undefined && archive.controllerStatus !== "NA" && (
                  <IconButton
                    label="Cancelar"
                    Icon={X}
                    tone="danger"
                    onClick={() =>
                      run(() => api.extraction.cancel(archive.controllerId!), {
                        refresh: [keys.extraction],
                      })
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="flex items-center gap-2 text-sm text-muted">
        <Plus className="h-4 w-4" />
        La lista completa de contraseñas, borrar los comprimidos al terminar y la carpeta de destino
        están en
        <Link href="/settings#extraction" className="text-sky-500 hover:underline">
          Ajustes
        </Link>
        .
      </p>
    </div>
  );
}
