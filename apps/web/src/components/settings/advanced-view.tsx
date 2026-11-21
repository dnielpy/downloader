"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { Button } from "../ui/button";
import { Input, Select, Switch } from "../ui/field";
import { Card, Empty, PageHeader, Spinner } from "../ui/misc";
import { ConfigEntryRow, shortInterface, useAllConfig } from "./config-entry";

const PAGE = 60;

/** JDownloader's Advanced Settings: every setting, searchable, filtered by section. */
export function AdvancedView() {
  const { data, isPending, error } = useAllConfig();
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("");
  const [changedOnly, setChangedOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const needle = useDeferredValue(search.trim().toLowerCase());

  const sections = useMemo(
    () =>
      [...new Set((data ?? []).map((entry) => entry.interfaceName))].sort((a, b) =>
        shortInterface(a).localeCompare(shortInterface(b)),
      ),
    [data],
  );

  const entries = useMemo(() => {
    return (data ?? []).filter((entry) => {
      if (section && entry.interfaceName !== section) return false;
      if (changedOnly && JSON.stringify(entry.value) === JSON.stringify(entry.defaultValue))
        return false;
      if (!needle) return true;
      return `${entry.interfaceName}.${entry.key} ${entry.docs ?? ""}`
        .toLowerCase()
        .includes(needle);
    });
  }, [data, section, changedOnly, needle]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Ajustes avanzados"
        subtitle={data ? `${entries.length} de ${data.length} ajustes` : undefined}
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setShown(PAGE);
            }}
            placeholder="Buscar por nombre o descripción (p. ej. proxy, chunks, captcha)"
            aria-label="Buscar ajustes"
            className="pl-9"
          />
        </div>
        <Select
          value={section}
          onChange={(event) => {
            setSection(event.target.value);
            setShown(PAGE);
          }}
          className="w-auto max-w-72"
          aria-label="Sección"
        >
          <option value="">Todas las secciones</option>
          {sections.map((name) => (
            <option key={name} value={name}>
              {shortInterface(name)}
            </option>
          ))}
        </Select>
        <Switch checked={changedOnly} onChange={setChangedOnly} label="Solo cambiados" />
      </div>

      <Card className="overflow-hidden">
        {isPending ? (
          <div className="flex items-center gap-2 px-5 py-10 text-sm text-muted">
            <Spinner /> Leyendo los ajustes de JDownloader…
          </div>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-rose-500">{error.message}</p>
        ) : !entries.length ? (
          <Empty Icon={SlidersHorizontal} title="Ningún ajuste coincide" />
        ) : (
          <>
            {entries.slice(0, shown).map((entry) => (
              <ConfigEntryRow
                key={`${entry.interfaceName}.${entry.key}`}
                entry={entry}
                showInterface
              />
            ))}
            {entries.length > shown && (
              <div className="border-t border-surface-border p-3 text-center">
                <Button size="sm" onClick={() => setShown(shown + PAGE)}>
                  Mostrar más ({entries.length - shown} restantes)
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
