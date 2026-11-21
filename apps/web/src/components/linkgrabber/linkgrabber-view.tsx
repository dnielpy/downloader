"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  CircleHelp,
  CircleSlash,
  CircleCheck,
  Copy,
  Eraser,
  FolderInput,
  FolderPlus,
  Globe,
  Layers,
  Link2,
  ListOrdered,
  Pencil,
  Play,
  Plus,
  Power,
  PowerOff,
  Search,
  Square,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { api, type Selection } from "@/lib/jd/api";
import {
  type Availability,
  type CleanupAction,
  type CrawledLink,
  type CrawledPackage,
  type LinkVariant,
  PRIORITIES,
  PRIORITY_LABELS,
} from "@/lib/jd/types";
import { bytes } from "@/lib/format";
import { keys, LIVE, useAction } from "@/lib/queries";

import { useAddLinks } from "../add-links";
import { type Column, filterTree, TreeTable, useTreeSelection } from "../tree-table";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Input } from "../ui/field";
import { Menu, type MenuItem } from "../ui/menu";
import { Badge, Card, Empty, PageHeader, Spinner } from "../ui/misc";
import { usePrompt } from "../ui/prompt";
import { useToast } from "../ui/toast";

const AVAILABILITY: Record<
  Availability,
  { label: string; tone: "success" | "danger" | "warning" | "neutral" }
> = {
  ONLINE: { label: "Online", tone: "success" },
  OFFLINE: { label: "Offline", tone: "danger" },
  TEMP_UNKNOWN: { label: "Temp. desconocido", tone: "warning" },
  UNKNOWN: { label: "Sin comprobar", tone: "neutral" },
};

function AvailabilityIcon({ link }: { link: CrawledLink }) {
  switch (link.availability) {
    case "ONLINE":
      return <CircleCheck className="h-4 w-4 shrink-0 text-emerald-500" />;
    case "OFFLINE":
      return <CircleSlash className="h-4 w-4 shrink-0 text-rose-500" />;
    default:
      return <CircleHelp className="h-4 w-4 shrink-0 text-muted" />;
  }
}

function PackageAvailability({ pkg }: { pkg: CrawledPackage }) {
  return (
    <span className="flex flex-wrap gap-1">
      {!!pkg.onlineCount && <Badge tone="success">{pkg.onlineCount} online</Badge>}
      {!!pkg.offlineCount && <Badge tone="danger">{pkg.offlineCount} offline</Badge>}
      {!!(pkg.unknownCount || pkg.tempUnknownCount) && (
        <Badge>{(pkg.unknownCount ?? 0) + (pkg.tempUnknownCount ?? 0)} ?</Badge>
      )}
    </span>
  );
}

const COLUMNS: Column<CrawledPackage, CrawledLink>[] = [
  {
    id: "size",
    header: "Tamaño",
    className: "w-24 max-sm:hidden",
    pkg: (p) => bytes(p.bytesTotal),
    link: (l) => bytes(l.bytesTotal),
  },
  {
    id: "availability",
    header: "Estado",
    className: "w-40 max-md:w-28",
    pkg: (p) => <PackageAvailability pkg={p} />,
    link: (l) => {
      const info = AVAILABILITY[l.availability ?? "UNKNOWN"];
      return <Badge tone={info.tone}>{info.label}</Badge>;
    },
  },
  {
    id: "host",
    header: "Host",
    className: "w-36 max-lg:hidden",
    pkg: (p) => <span className="block truncate">{p.hosts?.join(", ")}</span>,
    link: (l) => <span className="block truncate">{l.host}</span>,
  },
  {
    id: "variant",
    header: "Variante",
    className: "w-32 max-xl:hidden",
    pkg: () => "",
    link: (l) => <span className="block truncate">{l.variant?.name ?? ""}</span>,
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
  { action: "DELETE_OFFLINE", label: "Quitar offline" },
  { action: "DELETE_DISABLED", label: "Quitar desactivados" },
  { action: "DELETE_DUPE", label: "Quitar los que ya están en descargas" },
];

/** Picks one of the variants of a link (video quality, format…). */
function VariantDialog({ link, onClose }: { link: CrawledLink | null; onClose: () => void }) {
  const run = useAction();
  const { data: variants, isPending } = useQuery({
    queryKey: ["grabber", "variants", link?.uuid],
    queryFn: () => api.grabber.variants(link!.uuid),
    enabled: link !== null,
  });
  return (
    <Dialog open={link !== null} onClose={onClose} title="Elegir variante">
      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Spinner /> Cargando variantes…
        </div>
      ) : !variants?.length ? (
        <p className="text-sm text-muted">Este enlace no tiene variantes.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {variants.map((variant: LinkVariant) => (
            <button
              key={variant.id}
              type="button"
              onClick={async () => {
                await run(() => api.grabber.setVariant(link!.uuid, variant.id), {
                  refresh: [keys.grabber],
                });
                onClose();
              }}
              className={`rounded-xl px-3 py-2 text-left text-sm hover:bg-track ${variant.id === link?.variant?.id ? "bg-sky-500/12 font-medium" : ""}`}
            >
              {variant.name}
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
}

export function LinkGrabberView() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState<{ at: { x: number; y: number }; items: MenuItem[] } | null>(
    null,
  );
  const [variantLink, setVariantLink] = useState<CrawledLink | null>(null);
  const tree = useTreeSelection();
  const run = useAction();
  const toast = useToast();
  const addLinks = useAddLinks();
  const { prompt, confirm } = usePrompt();

  const packagesQuery = useQuery({
    queryKey: keys.grabberPackages,
    queryFn: api.grabber.packages,
    refetchInterval: LIVE,
  });
  const packages = useMemo(() => packagesQuery.data ?? [], [packagesQuery.data]);
  const { data: collecting } = useQuery({
    queryKey: keys.grabberJobs,
    queryFn: api.grabber.isCollecting,
    refetchInterval: LIVE,
  });

  const searching = search.trim().length > 0;
  const openIds = useMemo(
    () => [...expanded].filter((id) => packages.some((p) => p.uuid === id)).sort(),
    [expanded, packages],
  );
  const linksQuery = useQuery({
    queryKey: keys.grabberLinks(searching ? [-1] : openIds),
    queryFn: () => api.grabber.links(searching ? undefined : openIds),
    enabled: searching || openIds.length > 0,
    refetchInterval: LIVE * 2,
  });
  const links = useMemo(
    () => (searching || openIds.length > 0 ? (linksQuery.data ?? []) : []),
    [linksQuery.data, searching, openIds.length],
  );

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

  const refresh = { refresh: [keys.grabber, keys.downloads] };
  const all: Selection = { linkIds: [], packageIds: packages.map((p) => p.uuid) };
  const linkCount = packages.reduce((sum, p) => sum + (p.childCount ?? 0), 0);

  const toDownloads = async (s: Selection, start: boolean) => {
    await run(
      async () => {
        await api.grabber.moveToDownloads(s);
        if (start) await api.controller.start();
      },
      { ...refresh, success: start ? "Descargando" : "Añadido a descargas" },
    );
    tree.clear();
  };

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
      { label: "Añadir y empezar", Icon: Play, onSelect: () => toDownloads(s, true) },
      { label: "Añadir a descargas", Icon: Plus, onSelect: () => toDownloads(s, false) },
      "separator",
      {
        label: "Activar",
        Icon: Power,
        onSelect: () => run(() => api.grabber.setEnabled(true, s), refresh),
      },
      {
        label: "Desactivar",
        Icon: PowerOff,
        onSelect: () => run(() => api.grabber.setEnabled(false, s), refresh),
      },
      {
        label: "Prioridad",
        Icon: ListOrdered,
        items: PRIORITIES.map((priority) => ({
          label: PRIORITY_LABELS[priority],
          onSelect: () => run(() => api.grabber.setPriority(priority, s), refresh),
        })),
      },
      {
        label: "Elegir variante…",
        Icon: Layers,
        disabled: !singleLink?.variants,
        onSelect: () => singleLink && setVariantLink(singleLink),
      },
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
                ? api.grabber.renameLink(singleLink.uuid, name.trim())
                : api.grabber.renamePackage(singlePackage!.uuid, name.trim()),
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
          await run(() => api.grabber.moveToNewPackage(s, name.trim(), folder), refresh);
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
          await run(() => api.grabber.setDirectory(folder.trim(), s.packageIds), refresh);
        },
      },
      {
        label: "Comprobar si están online",
        Icon: Globe,
        onSelect: () =>
          run(() => api.grabber.checkOnline(s), { ...refresh, success: "Comprobando…" }),
      },
      {
        label: "Copiar URLs",
        Icon: Copy,
        onSelect: async () => {
          const result = await run(
            async () => {
              const fromPackages = s.packageIds.length ? await api.grabber.links(s.packageIds) : [];
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
        label: "Quitar",
        Icon: Trash2,
        danger: true,
        onSelect: async () => {
          const ok = await confirm({
            title: "Quitar del LinkGrabber",
            message: `Se quitarán ${count} elemento(s).`,
            confirm: "Quitar",
            danger: true,
          });
          if (ok) {
            await run(() => api.grabber.remove(s), refresh);
            tree.clear();
          }
        },
      },
    ];
  };

  const cleanupItems: MenuItem[] = [
    ...CLEANUPS.map(({ action, label }) => ({
      label,
      onSelect: () =>
        run(
          () =>
            api.grabber.cleanup(
              { linkIds: [], packageIds: [] },
              action,
              "REMOVE_LINKS_ONLY",
              "ALL",
            ),
          refresh,
        ),
    })),
    "separator",
    {
      label: "Vaciar el LinkGrabber",
      Icon: Trash2,
      danger: true,
      onSelect: async () => {
        const ok = await confirm({
          title: "Vaciar el LinkGrabber",
          message: "Se quitarán todos los enlaces que aún no se han añadido a descargas.",
          confirm: "Vaciar",
          danger: true,
        });
        if (ok) {
          await run(api.grabber.clear, refresh);
          tree.clear();
        }
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="LinkGrabber"
        subtitle={
          <span className="inline-flex items-center gap-2">
            {packagesQuery.isPending
              ? "Cargando…"
              : `${packages.length} paquete(s) · ${linkCount} enlace(s)`}
            {collecting && (
              <span className="inline-flex items-center gap-1.5 text-sky-500">
                <Spinner className="h-3 w-3" /> Analizando enlaces…
              </span>
            )}
          </span>
        }
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar"
                aria-label="Buscar en el LinkGrabber"
                className="w-44 pl-9"
              />
            </div>
            {collecting && (
              <Button size="sm" Icon={Square} onClick={() => run(api.grabber.abort, refresh)}>
                Parar análisis
              </Button>
            )}
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
            <Button
              size="sm"
              Icon={Plus}
              disabled={!packages.length}
              onClick={() => toDownloads(all, false)}
            >
              Todo a descargas
            </Button>
            <Button
              size="sm"
              variant="primary"
              Icon={Play}
              disabled={!packages.length}
              onClick={() => toDownloads(all, true)}
            >
              Empezar todo
            </Button>
          </>
        }
      />

      {tree.selected.size > 0 && (
        <div className="glass flex flex-wrap items-center gap-2 rounded-2xl px-4 py-2 text-sm">
          <span className="font-medium">{tree.selected.size} seleccionado(s)</span>
          <Button
            size="sm"
            variant="ghost"
            Icon={Play}
            onClick={() => toDownloads(tree.selection, true)}
          >
            Añadir y empezar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            Icon={Plus}
            onClick={() => toDownloads(tree.selection, false)}
          >
            Añadir a descargas
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
            <Spinner /> Leyendo el LinkGrabber…
          </div>
        ) : packages.length === 0 ? (
          <Empty
            Icon={Link2}
            title={collecting ? "Analizando enlaces…" : "El LinkGrabber está vacío"}
          >
            <p>
              Los enlaces que añades se analizan aquí: JDownloader comprueba si están online, agrupa
              los archivos en paquetes y luego tú decides qué pasa a descargas.
            </p>
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
            linkIcon={(link) => <AvailabilityIcon link={link} />}
            packageMeta={(p) => (
              <>
                {p.childCount ?? 0} archivo(s) · {p.saveTo}
              </>
            )}
            linkMeta={(l) => l.url ?? l.host}
            dim={(row) => row.item.enabled === false}
          />
        )}
      </Card>

      {menu && <Menu at={menu.at} items={menu.items} onClose={() => setMenu(null)} />}
      <VariantDialog link={variantLink} onClose={() => setVariantLink(null)} />
    </div>
  );
}
