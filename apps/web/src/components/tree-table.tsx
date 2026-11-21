"use client";

import { ChevronRight, Ellipsis, Package } from "lucide-react";
import { type MouseEvent, type ReactNode, useCallback, useMemo, useRef, useState } from "react";

import type { Selection } from "@/lib/jd/api";

type Node = { uuid: number };
type Leaf = Node & { packageUUID: number };

export type Column<P, L> = {
  id: string;
  header: string;
  /** Width and responsive visibility, e.g. "w-28 max-md:hidden". */
  className?: string;
  pkg: (pkg: P) => ReactNode;
  link: (link: L) => ReactNode;
};

type Row<P, L> = { kind: "pkg"; item: P } | { kind: "link"; item: L };
const rowKey = (row: { kind: string; item: Node }) => `${row.kind}:${row.item.uuid}`;

/** The selected packages and links of a tree, with click, Ctrl/Cmd-click and Shift-click like a desktop list. */
export function useTreeSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const anchor = useRef<string | null>(null);

  const click = useCallback(
    (
      key: string,
      order: string[],
      event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean },
      toggle = false,
    ) => {
      setSelected((current) => {
        if (event.shiftKey && anchor.current && order.includes(anchor.current)) {
          const [a, b] = [order.indexOf(anchor.current), order.indexOf(key)].sort((x, y) => x - y);
          return new Set([...current, ...order.slice(a, b + 1)]);
        }
        anchor.current = key;
        if (toggle || event.metaKey || event.ctrlKey) {
          const next = new Set(current);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        }
        return new Set([key]);
      });
    },
    [],
  );

  const clear = useCallback(() => setSelected(new Set()), []);

  const selection = useMemo<Selection>(() => {
    const linkIds: number[] = [];
    const packageIds: number[] = [];
    for (const key of selected) {
      const [kind, id] = key.split(":");
      (kind === "pkg" ? packageIds : linkIds).push(Number(id));
    }
    return { linkIds, packageIds };
  }, [selected]);

  return { selected, setSelected, click, clear, selection, anchor };
}

type TreeTableProps<P extends Node & { name: string }, L extends Leaf & { name: string }> = {
  packages: P[];
  /** The links of the expanded packages. */
  links: L[];
  columns: Column<P, L>[];
  expanded: Set<number>;
  onToggle: (uuid: number) => void;
  tree: ReturnType<typeof useTreeSelection>;
  /** Opens the actions menu for the current selection at a point. */
  onMenu: (at: { x: number; y: number }) => void;
  onOpen?: (row: Row<P, L>) => void;
  linkIcon?: (link: L) => ReactNode;
  packageMeta?: (pkg: P) => ReactNode;
  linkMeta?: (link: L) => ReactNode;
  dim?: (row: Row<P, L>) => boolean;
};

export function TreeTable<P extends Node & { name: string }, L extends Leaf & { name: string }>({
  packages,
  links,
  columns,
  expanded,
  onToggle,
  tree,
  onMenu,
  linkIcon,
  packageMeta,
  linkMeta,
  dim,
}: TreeTableProps<P, L>) {
  const rows = useMemo(() => {
    const byPackage = new Map<number, L[]>();
    for (const link of links) {
      const list = byPackage.get(link.packageUUID) ?? [];
      list.push(link);
      byPackage.set(link.packageUUID, list);
    }
    const out: Row<P, L>[] = [];
    for (const pkg of packages) {
      out.push({ kind: "pkg", item: pkg });
      if (expanded.has(pkg.uuid)) {
        for (const link of byPackage.get(pkg.uuid) ?? []) out.push({ kind: "link", item: link });
      }
    }
    return out;
  }, [packages, links, expanded]);

  const order = useMemo(() => rows.map(rowKey), [rows]);
  const allSelected = order.length > 0 && order.every((key) => tree.selected.has(key));

  const contextMenu = (event: MouseEvent, key: string) => {
    event.preventDefault();
    if (!tree.selected.has(key))
      tree.click(key, order, { shiftKey: false, metaKey: false, ctrlKey: false });
    onMenu({ x: event.clientX, y: event.clientY });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="w-10 border-b border-surface-border py-2 pl-4">
              <input
                type="checkbox"
                aria-label="Seleccionar todo"
                checked={allSelected}
                onChange={() => tree.setSelected(allSelected ? new Set() : new Set(order))}
                className="accent-sky-500"
              />
            </th>
            <th className="border-b border-surface-border py-2 pr-3 font-medium">Nombre</th>
            {columns.map((column) => (
              <th
                key={column.id}
                className={`border-b border-surface-border py-2 pr-3 font-medium ${column.className ?? ""}`}
              >
                {column.header}
              </th>
            ))}
            <th className="w-12 border-b border-surface-border" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const isSelected = tree.selected.has(key);
            const faded = dim?.(row) ?? false;
            const isPkg = row.kind === "pkg";
            return (
              <tr
                key={key}
                aria-selected={isSelected}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("button, input, a")) return;
                  tree.click(key, order, event);
                }}
                onDoubleClick={() => isPkg && onToggle(row.item.uuid)}
                onContextMenu={(event) => contextMenu(event, key)}
                className={`group cursor-default select-none ${isSelected ? "row-selected" : "row-hover"} ${faded ? "opacity-50" : ""}`}
              >
                <td className="border-b border-surface-border py-2 pl-4 align-middle">
                  <input
                    type="checkbox"
                    aria-label={`Seleccionar ${row.item.name}`}
                    checked={isSelected}
                    onChange={(event) =>
                      tree.click(
                        key,
                        order,
                        event.nativeEvent as unknown as globalThis.MouseEvent,
                        true,
                      )
                    }
                    className="accent-sky-500"
                  />
                </td>
                <td className="border-b border-surface-border py-2 pr-3 align-middle">
                  {isPkg ? (
                    <div className="flex min-w-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggle(row.item.uuid)}
                        aria-expanded={expanded.has(row.item.uuid)}
                        aria-label={expanded.has(row.item.uuid) ? "Plegar" : "Desplegar"}
                        className="rounded-md p-0.5 text-muted hover:bg-track hover:text-foreground"
                      >
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${expanded.has(row.item.uuid) ? "rotate-90" : ""}`}
                        />
                      </button>
                      <Package className="h-4 w-4 shrink-0 text-sky-500" />
                      <div className="min-w-0">
                        <div className="truncate font-medium" title={row.item.name}>
                          {row.item.name}
                        </div>
                        {packageMeta && (
                          <div className="truncate text-xs text-muted">{packageMeta(row.item)}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-center gap-2 pl-7">
                      {linkIcon?.(row.item)}
                      <div className="min-w-0">
                        <div className="truncate" title={row.item.name}>
                          {row.item.name}
                        </div>
                        {linkMeta && (
                          <div className="truncate text-xs text-muted">{linkMeta(row.item)}</div>
                        )}
                      </div>
                    </div>
                  )}
                </td>
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={`border-b border-surface-border py-2 pr-3 align-middle tabular-nums ${column.className ?? ""} ${isPkg ? "" : "text-muted"}`}
                  >
                    {isPkg ? column.pkg(row.item) : column.link(row.item)}
                  </td>
                ))}
                <td className="border-b border-surface-border py-2 pr-2 text-right align-middle">
                  <button
                    type="button"
                    aria-label="Acciones"
                    onClick={(event) => {
                      if (!tree.selected.has(key)) {
                        tree.click(key, order, { shiftKey: false, metaKey: false, ctrlKey: false });
                      }
                      const box = event.currentTarget.getBoundingClientRect();
                      onMenu({ x: box.right - 220, y: box.bottom + 4 });
                    }}
                    className="rounded-lg p-1.5 text-muted opacity-60 group-hover:opacity-100 hover:bg-track hover:text-foreground"
                  >
                    <Ellipsis className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Filters packages and links by a search text; a package matching keeps all its links. */
export function filterTree<P extends Node & { name: string }, L extends Leaf & { name: string }>(
  packages: P[],
  links: L[],
  search: string,
): { packages: P[]; links: L[] } {
  const needle = search.trim().toLowerCase();
  if (!needle) return { packages, links };
  const matchingLinks = links.filter((link) => link.name.toLowerCase().includes(needle));
  const withLinks = new Set(matchingLinks.map((link) => link.packageUUID));
  const kept = packages.filter(
    (pkg) => pkg.name.toLowerCase().includes(needle) || withLinks.has(pkg.uuid),
  );
  const keptIds = new Set(
    kept.filter((pkg) => pkg.name.toLowerCase().includes(needle)).map((p) => p.uuid),
  );
  return {
    packages: kept,
    links: links.filter((link) => keptIds.has(link.packageUUID) || matchingLinks.includes(link)),
  };
}
