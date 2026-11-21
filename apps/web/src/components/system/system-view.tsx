"use client";

import { useQuery } from "@tanstack/react-query";
import { Cpu, HardDrive, Power, RefreshCw, Server, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { api } from "@/lib/jd/api";
import { bytes, duration } from "@/lib/format";
import { keys, useAction, useStorage } from "@/lib/queries";

import { Button } from "../ui/button";
import { Badge, Card, CardHeader, PageHeader, Progress } from "../ui/misc";
import { usePrompt } from "../ui/prompt";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-surface-border px-5 py-2.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right tabular-nums">{children}</span>
    </div>
  );
}

export function SystemView() {
  const run = useAction();
  const { confirm } = usePrompt();
  const info = useQuery({
    queryKey: keys.system,
    queryFn: async () => {
      const [version, revision, uptime, system] = await Promise.all([
        api.jd.version().catch(() => null),
        api.jd.coreRevision().catch(() => null),
        api.jd.uptime().catch(() => null),
        api.system.infos().catch(() => null),
      ]);
      return { version, revision, uptime, system };
    },
    refetchInterval: 10_000,
  });
  const update = useQuery({
    queryKey: keys.update,
    queryFn: api.update.available,
    refetchInterval: 60_000,
  });
  const { data: storage } = useStorage();
  const system = info.data?.system;
  const disk = storage?.[0];

  const restart = async (withUpdate: boolean) => {
    const ok = await confirm({
      title: withUpdate ? "Actualizar JDownloader" : "Reiniciar JDownloader",
      message: withUpdate
        ? "JDownloader se cerrará, instalará la actualización y volverá a arrancar. Las descargas en curso se pausan y siguen después."
        : "Las descargas en curso se pausan y siguen al volver. Tarda unos segundos.",
      confirm: withUpdate ? "Actualizar" : "Reiniciar",
    });
    if (!ok) return;
    await run(withUpdate ? api.update.restartAndUpdate : api.system.restart, {
      success: "Reiniciando JDownloader…",
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Sistema" subtitle="El motor JDownloader que corre en el servidor" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader
            title="JDownloader"
            Icon={Server}
            actions={
              <Button size="sm" Icon={Power} onClick={() => restart(false)}>
                Reiniciar
              </Button>
            }
          />
          <Row label="Versión">{info.data?.version ?? "–"}</Row>
          <Row label="Revisión del núcleo">{info.data?.revision ?? "–"}</Row>
          <Row label="Funcionando desde hace">{duration(info.data?.uptime)}</Row>
          <Row label="Modo">{system?.headless ? "Sin interfaz (headless)" : "Con interfaz"}</Row>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Actualizaciones"
            Icon={Sparkles}
            actions={
              <Button
                size="sm"
                Icon={RefreshCw}
                onClick={() =>
                  run(api.update.check, {
                    refresh: [keys.update],
                    success: "Buscando actualizaciones…",
                  })
                }
              >
                Buscar
              </Button>
            }
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-border px-5 py-4">
            {update.data ? (
              <>
                <Badge tone="info">Hay una actualización</Badge>
                <Button variant="primary" size="sm" Icon={Sparkles} onClick={() => restart(true)}>
                  Instalar y reiniciar
                </Button>
              </>
            ) : (
              <span className="text-sm text-muted">
                {update.isPending ? "Comprobando…" : "JDownloader está al día."}
              </span>
            )}
          </div>
          <p className="border-t border-surface-border px-5 py-3 text-xs text-muted">
            JDownloader se actualiza solo. La imagen de Docker se renueva con scripts/update.sh.
          </p>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Java y memoria" Icon={Cpu} />
          <Row label="Sistema">
            {system
              ? `${system.osName ?? ""} ${system.osVersion ?? ""} (${system.archFamily ?? ""})`
              : "–"}
          </Row>
          <Row label="Java">
            {system ? `${system.javaName ?? ""} ${system.javaVersionString ?? ""}` : "–"}
          </Row>
          <Row label="Núcleos">{system?.cpuNum ?? "–"}</Row>
          <div className="border-t border-surface-border px-5 py-3">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-muted">Memoria usada</span>
              <span className="tabular-nums">
                {bytes(system?.heapUsed)} de {bytes(system?.heapMax)}
              </span>
            </div>
            <Progress
              value={
                system?.heapUsed && system.heapMax ? (system.heapUsed / system.heapMax) * 100 : null
              }
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Disco de descargas" Icon={HardDrive} />
          {disk && !disk.error ? (
            <div className="border-t border-surface-border px-5 py-4">
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-mono text-muted">{disk.path}</span>
                <span className="tabular-nums">
                  {bytes(disk.free)} libres de {bytes(disk.size)}
                </span>
              </div>
              <Progress
                value={disk.size > 0 ? ((disk.size - disk.free) / disk.size) * 100 : null}
                tone={disk.free / disk.size < 0.1 ? "rose" : "sky"}
              />
            </div>
          ) : (
            <p className="border-t border-surface-border px-5 py-4 text-sm text-muted">
              {disk?.error ?? "Sin datos"}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
