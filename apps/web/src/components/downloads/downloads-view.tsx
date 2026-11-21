"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Ban,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleAlert,
  CircleCheck,
  CirclePause,
  Copy,
  Download,
  Eraser,
  FileArchive,
  FolderInput,
  FolderPlus,
  Flag,
  FlagOff,
  Globe,
  KeyRound,
  ListOrdered,
  Pencil,
  Play,
  Plus,
  Power,
  PowerOff,
  RotateCcw,
  Search,
  Split,
  Trash2,
  Undo2,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import { api, type Selection } from "@/lib/jd/api";
import {
  type CleanupAction,
  type DownloadLink,
  type FilePackage,
  PRIORITIES,
  PRIORITY_LABELS,
} from "@/lib/jd/types";
import { bytes, dateTime, eta, percent, speed } from "@/lib/format";
import { keys, LIVE, useAction } from "@/lib/queries";

import { useAddLinks } from "../add-links";
import { type Column, filterTree, TreeTable, useTreeSelection } from "../tree-table";
import { Button } from "../ui/button";
import { Input } from "../ui/field";
import { Menu, type MenuItem } from "../ui/menu";
import { Badge, Card, Empty, PageHeader, Progress, Spinner } from "../ui/misc";
import { usePrompt } from "../ui/prompt";
import { useToast } from "../ui/toast";

function linkTone(link: DownloadLink): "sky" | "emerald" | "rose" | "muted" {
  if (link.finished) return "emerald";
  if (link.skipped || link.statusIconKey === "error" || link.statusIconKey === "false")
    return "rose";
  if (link.running) return "sky";
  return "muted";
}

function LinkIcon({ link }: { link: DownloadLink }) {
  if (link.finished) return <CircleCheck className="h-4 w-4 shrink-0 text-emerald-500" />;
  if (link.running) return <Download className="h-4 w-4 shrink-0 animate-pulse text-sky-500" />;
  if (link.skipped) return <CirclePause className="h-4 w-4 shrink-0 text-amber-500" />;
  if (link.statusIconKey === "error" || link.statusIconKey === "false")
    return <CircleAlert className="h-4 w-4 shrink-0 text-rose-500" />;
  if (link.enabled === false) return <Ban className="h-4 w-4 shrink-0 text-muted" />;
  return <Download className="h-4 w-4 shrink-0 text-muted/60" />;
}

function ProgressCell({
  loaded,
  total,
  running,
  finished,
  tone,
}: {
  loaded?: number;
  total?: number;
  running?: boolean;
  finished?: boolean;
  tone: "sky" | "emerald" | "rose" | "muted";
}) {
  const value = finished ? 100 : percent(loaded, total);
  return (
    <div className="flex flex-col gap-1">
      <Progress value={value} active={running} tone={tone} />
      <span className="text-[11px] text-muted">
        {value === null ? bytes(loaded) : `${value.toFixed(value < 10 && value > 0 ? 1 : 0)} %`}
      </span>
    </div>
  );
}

const COLUMNS: Column<FilePackage, DownloadLink>[] = [
  {
    id: "size",
    header: "Tamaño",
    className: "w-24 max-sm:hidden",
    pkg: (p) => bytes(p.bytesTotal),
    link: (l) => bytes(l.bytesTotal),
  },
  {
    id: "progress",
    header: "Progreso",
    className: "w-36 max-md:w-24",
    pkg: (p) => (
      <ProgressCell
        loaded={p.bytesLoaded}
        total={p.bytesTotal}
        running={p.running}
        finished={p.finished}
        tone={p.finished ? "emerald" : p.running ? "sky" : "muted"}
      />
    ),
    link: (l) => (
      <ProgressCell
        loaded={l.bytesLoaded}
        total={l.bytesTotal}
        running={l.running}
        finished={l.finished}
        tone={linkTone(l)}
      />
    ),
  },
  {
    id: "speed",
    header: "Velocidad",
    className: "w-24 max-md:hidden",
    pkg: (p) => (p.speed ? speed(p.speed) : ""),
    link: (l) => (l.speed ? speed(l.speed) : ""),
  },
  {
    id: "eta",
    header: "Restante",
    className: "w-24 max-lg:hidden",
    pkg: (p) => eta(p.eta),
    link: (l) => eta(l.eta),
  },
  {
    id: "host",
    header: "Host",
    className: "w-36 max-xl:hidden",
    pkg: (p) => <span className="block truncate">{p.hosts?.join(", ")}</span>,
    link: (l) => <span className="block truncate">{l.host}</span>,
  },
  {
    id: "priority",
    header: "Prioridad",
    className: "w-24 max-2xl:hidden",
    pkg: (p) => (p.priority && p.priority !== "DEFAULT" ? PRIORITY_LABELS[p.priority] : ""),
    link: (l) => (l.priority && l.priority !== "DEFAULT" ? PRIORITY_LABELS[l.priority] : ""),
  },
];

const CLEANUPS: { action: CleanupAction; label: string }[] = [
  { action: "DELETE_FINISHED", label: "Quitar terminados" },
  { action: "DELETE_FAILED", label: "Quitar fallidos" },
  { action: "DELETE_OFFLINE", label: "Quitar offline" },
  { action: "DELETE_DISABLED", label: "Quitar desactivados" },
  { action: "DELETE_DUPE", label: "Quitar duplicados" },
];

export function DownloadsView() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState<{ at: { x: number; y: number }; items: MenuItem[] } | null>(
    null,
  );
  const tree = useTreeSelection();
  const run = useAction();
  const toast = useToast();
  const addLinks = useAddLinks();
  const { prompt, confirm } = usePrompt();

  const packagesQuery = useQuery({
    queryKey: keys.downloadPackages,
    queryFn: api.downloads.packages,
    refetchInterval: LIVE,
  });
  const packages = useMemo(() => packagesQuery.data ?? [], [packagesQuery.data]);

  // Only the links of open packages are read, unless a search needs all of them
  const searching = search.trim().length > 0;
  const openIds = useMemo(
    () => [...expanded].filter((id) => packages.some((p) => p.uuid === id)).sort(),
    [expanded, packages],
  );
  const linksQuery = useQuery({
    queryKey: keys.downloadLinks(searching ? [-1] : openIds),
    queryFn: () => api.downloads.links(searching ? undefined : openIds),
    enabled: searching || openIds.length > 0,
    refetchInterval: LIVE,
  });
  const links = useMemo(
    () => (searching || openIds.length > 0 ? (linksQuery.data ?? []) : []),
    [linksQuery.data, searching, openIds.length],
  );

  const { data: stopMark } = useQuery({
    queryKey: keys.stopMark,
    queryFn: api.downloads.stopMark,
    refetchInterval: 5000,
  });

  const filtered = useMemo(() => filterTree(packages, links, search), [packages, links, search]);
  const shownExpanded = useMemo(() => {
    if (!searching) return expanded;
    return new Set([...expanded, ...filtered.links.map((l) => l.packageUUID)]);
  }, [expanded, filtered.links, searching]);

  const toggle = (uuid: number) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });

  const totals = useMemo(() => {
    let loaded = 0;
    let total = 0;
    let running = 0;
    for (const p of packages) {
      loaded += Math.max(0, p.bytesLoaded ?? 0);
      total += Math.max(0, p.bytesTotal ?? 0);
      if (p.running) running++;
    }
    return { loaded, total, running };
  }, [packages]);

  const refresh = { refresh: [keys.downloads, keys.toolbar] };

  const actionsFor = (s: Selection): MenuItem[] => {
    const single = s.linkIds.length + s.packageIds.length === 1;
    const singleLink =
      single && s.linkIds.length === 1 ? links.find((l) => l.uuid === s.linkIds[0]) : undefined;
    const singlePackage =
      single && s.packageIds.length === 1
        ? packages.find((p) => p.uuid === s.packageIds[0])
        : undefined;
    const count = s.linkIds.length + s.packageIds.length;

    return [
      {
        label: "Forzar descarga",
        Icon: Zap,
        onSelect: () => run(() => api.downloads.force(s), refresh),
      },
      {
        label: "Reanudar",
        Icon: Play,
        onSelect: () => run(() => api.downloads.resume(s), refresh),
      },
      {
        label: "Reiniciar",
        Icon: RotateCcw,
        onSelect: async () => {
          const ok = await confirm({
            title: "Reiniciar descargas",
            message: `Se borrará lo descargado de ${count} elemento(s) y empezarán de cero.`,
            confirm: "Reiniciar",
            danger: true,
          });
          if (ok) await run(() => api.downloads.reset(s), { ...refresh, success: "Reiniciado" });
        },
      },
      {
        label: "Activar",
        Icon: Power,
        onSelect: () => run(() => api.downloads.setEnabled(true, s), refresh),
      },
      {
        label: "Desactivar",
        Icon: PowerOff,
        onSelect: () => run(() => api.downloads.setEnabled(false, s), refresh),
      },
      {
        label: "Prioridad",
        Icon: ListOrdered,
        items: PRIORITIES.map((priority) => ({
          label: PRIORITY_LABELS[priority],
          onSelect: () => run(() => api.downloads.setPriority(priority, s), refresh),
        })),
      },
      "separator",
      {
        label: "Renombrar…",
        Icon: Pencil,
        disabled: !singleLink && !singlePackage,
        onSelect: async () => {
          const name = await prompt({
            title: "Renombrar",
            label: "Nuevo nombre",
            initial: singleLink?.name ?? singlePackage?.name,
            confirm: "Renombrar",
          });
          if (!name?.trim()) return;
          await run(
            () =>
              singleLink
                ? api.downloads.renameLink(singleLink.uuid, name.trim())
                : api.downloads.renamePackage(singlePackage!.uuid, name.trim()),
            refresh,
          );
        },
      },
      {
        label: "Mover a un paquete nuevo…",
        Icon: FolderPlus,
        onSelect: async () => {
          const name = await prompt({
            title: "Paquete nuevo",
            label: "Nombre del paquete",
            confirm: "Mover",
          });
          if (!name?.trim()) return;
          const folder =
            singlePackage?.saveTo ??
            packages.find((p) => s.packageIds.includes(p.uuid))?.saveTo ??
            "/output";
          await run(() => api.downloads.moveToNewPackage(s, name.trim(), folder), refresh);
        },
      },
      {
        label: "Cambiar carpeta de destino…",
        Icon: FolderInput,
        disabled: s.packageIds.length === 0,
        onSelect: async () => {
          const folder = await prompt({
            title: "Carpeta de destino",
            label: "Ruta dentro del contenedor (las descargas están en /output)",
            initial: singlePackage?.saveTo ?? "/output",
            confirm: "Cambiar",
          });
          if (!folder?.trim()) return;
          await run(() => api.downloads.setDirectory(folder.trim(), s.packageIds), {
            ...refresh,
            success: "Carpeta cambiada",
          });
        },
      },
      {
        label: "Contraseña de descarga…",
        Icon: KeyRound,
        onSelect: async () => {
          const password = await prompt({ title: "Contraseña de descarga", label: "Contraseña" });
          if (password === null) return;
          await run(() => api.downloads.setPassword(s, password), {
            ...refresh,
            success: "Contraseña guardada",
          });
        },
      },
      {
        label: "Separar por host",
        Icon: Split,
        onSelect: () => run(() => api.downloads.splitByHoster(s), refresh),
      },
      {
        label: "Comprobar si están online",
        Icon: Globe,
        onSelect: () =>
          run(() => api.downloads.checkOnline(s), { ...refresh, success: "Comprobando…" }),
      },
      {
        label: "Extraer ahora",
        Icon: FileArchive,
        onSelect: () =>
          run(() => api.extraction.startNow(s), {
            refresh: [keys.extraction],
            success: "Extracción en cola",
          }),
      },
      {
        label: "Quitar el estado de omitido",
        Icon: Undo2,
        onSelect: () => run(() => api.downloads.unskip(s), refresh),
      },
      {
        label: "Parar al llegar aquí",
        Icon: Flag,
        disabled: !single,
        onSelect: () =>
          run(
            () =>
              api.downloads.setStopMark(
                singleLink?.uuid ?? -1,
                singlePackage?.uuid ?? singleLink?.packageUUID ?? -1,
              ),
            { refresh: [keys.stopMark], success: "Marca de parada puesta" },
          ),
      },
      ...(stopMark && stopMark > 0
        ? [
            {
              label: "Quitar la marca de parada",
              Icon: FlagOff,
              onSelect: () => run(api.downloads.removeStopMark, { refresh: [keys.stopMark] }),
            },
          ]
        : []),
      {
        label: "Copiar URLs",
        Icon: Copy,
        onSelect: async () => {
          const result = await run(
            async () => {
              const fromPackages = s.packageIds.length
                ? await api.downloads.links(s.packageIds)
                : [];
              const fromLinks = links.filter((l) => s.linkIds.includes(l.uuid));
              return [
                ...new Set([...fromPackages, ...fromLinks].map((l) => l.url).filter(Boolean)),
              ];
            },
            { refresh: [] },
          );
          if (!result?.length) return;
          try {
            await navigator.clipboard.writeText(result.join("\n"));
            toast(`${result.length} URL(s) copiadas`);
          } catch {
            toast("El navegador no dejó copiar (hace falta https o localhost)", "error");
          }
        },
      },
      "separator",
      {
        label: "Quitar de la lista",
        Icon: Trash2,
        danger: true,
        onSelect: async () => {
          const ok = await confirm({
            title: "Quitar de la lista",
            message: `Se quitarán ${count} elemento(s) de la lista. Los archivos descargados se quedan en el disco.`,
            confirm: "Quitar",
            danger: true,
          });
          if (ok) {
            await run(() => api.downloads.remove(s), refresh);
            tree.clear();
          }
        },
      },
      {
        label: "Quitar y borrar los archivos",
        Icon: Trash2,
        danger: true,
        onSelect: async () => {
          const ok = await confirm({
            title: "Borrar archivos",
            message: `Se quitarán ${count} elemento(s) y se borrarán sus archivos del disco. No se puede deshacer.`,
            confirm: "Borrar",
            danger: true,
          });
          if (ok) {
            await run(
              () =>
                api.downloads.cleanup(s, "DELETE_ALL", "REMOVE_LINKS_AND_DELETE_FILES", "SELECTED"),
              { ...refresh, success: "Borrado" },
            );
            tree.clear();
          }
        },
      },
    ];
  };

  const cleanupItems: MenuItem[] = CLEANUPS.map(({ action, label }) => ({
    label,
    onSelect: () =>
      run(
        () =>
          api.downloads.cleanup(
            { linkIds: [], packageIds: [] },
            action,
            "REMOVE_LINKS_ONLY",
            "ALL",
          ),
        refresh,
      ),
  }));

  const selectedCount = tree.selected.size;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Descargas"
        subtitle={
          packagesQuery.isPending
            ? "Cargando…"
            : `${packages.length} paquete(s) · ${bytes(totals.loaded)} de ${bytes(totals.total)}${totals.running ? ` · ${totals.running} descargando` : ""}`
        }
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar"
                aria-label="Buscar en las descargas"
                className="w-48 pl-9"
              />
            </div>
            <Button
              size="sm"
              Icon={expanded.size ? ChevronsDownUp : ChevronsUpDown}
              onClick={() =>
                setExpanded(expanded.size ? new Set() : new Set(packages.map((p) => p.uuid)))
              }
            >
              {expanded.size ? "Plegar" : "Desplegar"}
            </Button>
            <Button
              size="sm"
              Icon={Eraser}
              onClick={(event) => {
                const box = event.currentTarget.getBoundingClientRect();
                setMenu({ at: { x: box.left, y: box.bottom + 6 }, items: cleanupItems });
              }}
            >
              Limpiar
            </Button>
          </>
        }
      />

      {selectedCount > 0 && (
        <div className="glass flex flex-wrap items-center gap-2 rounded-2xl px-4 py-2 text-sm">
          <span className="font-medium">{selectedCount} seleccionado(s)</span>
          <Button
            size="sm"
            variant="ghost"
            Icon={Zap}
            onClick={() => run(() => api.downloads.force(tree.selection), refresh)}
          >
            Forzar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            Icon={Power}
            onClick={() => run(() => api.downloads.setEnabled(true, tree.selection), refresh)}
          >
            Activar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            Icon={PowerOff}
            onClick={() => run(() => api.downloads.setEnabled(false, tree.selection), refresh)}
          >
            Desactivar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              setMenu({
                at: { x: box.left, y: box.bottom + 6 },
                items: actionsFor(tree.selection),
              });
            }}
          >
            Más…
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={tree.clear}>
            Quitar selección
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        {packagesQuery.isPending ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
            <Spinner /> Leyendo la lista de descargas…
          </div>
        ) : packages.length === 0 ? (
          <Empty Icon={Download} title="No hay descargas">
            <p>Añade enlaces: pasan por el LinkGrabber y desde ahí a la lista de descargas.</p>
            <Button variant="primary" Icon={Plus} className="mt-4" onClick={() => addLinks()}>
              Añadir enlaces
            </Button>
          </Empty>
        ) : (
          <TreeTable
            packages={filtered.packages}
            links={filtered.links}
            columns={COLUMNS}
            expanded={shownExpanded}
            onToggle={toggle}
            tree={tree}
            onMenu={(at) => setMenu({ at, items: actionsFor(tree.selection) })}
            linkIcon={(link) => <LinkIcon link={link} />}
            packageMeta={(p) => (
              <>
                {p.childCount ?? 0} archivo(s) · {p.saveTo}
                {p.status && <> · {p.status}</>}
              </>
            )}
            linkMeta={(l) => (
              <span className="inline-flex items-center gap-1.5">
                {stopMark === l.uuid && <Badge tone="warning">Parada</Badge>}
                {l.status ?? (l.finished ? `Terminado ${dateTime(l.finishedDate)}` : l.host)}
              </span>
            )}
            dim={(row) => row.item.enabled === false}
          />
        )}
      </Card>

      {menu && <Menu at={menu.at} items={menu.items} onClose={() => setMenu(null)} />}
    </div>
  );
}
