"use client";

import { useQuery } from "@tanstack/react-query";
import { RotateCcw, Save } from "lucide-react";
import { useState } from "react";

import { api } from "@/lib/jd/api";
import type { ConfigEntry } from "@/lib/jd/types";
import { keys, useAction } from "@/lib/queries";

import { Button, IconButton } from "../ui/button";
import { Input, Select, Switch, Textarea } from "../ui/field";

/** Every setting of JDownloader and its extensions, with values, defaults, docs and enum options. */
export function useAllConfig() {
  return useQuery({
    queryKey: keys.config("all"),
    queryFn: () =>
      api.config.query({
        values: true,
        defaultValues: true,
        description: true,
        enumInfo: true,
        includeExtensions: true,
      }),
    staleTime: 30_000,
  });
}

const NUMBER = /^(INT|LONG|SHORT|BYTE|DOUBLE|FLOAT)$/i;

function kind(entry: ConfigEntry): "boolean" | "number" | "string" | "enum" | "json" {
  const type = (entry.abstractType ?? entry.type ?? "").toUpperCase();
  if (entry.enumOptions?.length) return "enum";
  if (type === "BOOLEAN" || typeof entry.value === "boolean") return "boolean";
  if (NUMBER.test(type) || typeof entry.value === "number") return "number";
  if (type === "STRING" || typeof entry.value === "string") return "string";
  return "json";
}

/** "MaxSimultaneDownloads" → "Max simultane downloads". */
export function keyLabel(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function shortInterface(name: string): string {
  return name.split(".").pop() ?? name;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** One setting as a row: its label and docs on the left, a control fitting its type on the right. */
export function ConfigEntryRow({
  entry,
  label,
  hint,
  showInterface,
  format,
}: {
  entry: ConfigEntry;
  label?: string;
  hint?: string;
  showInterface?: boolean;
  /** Shows the value in a readable form under the control, e.g. bytes per second as "2,0 MB/s". */
  format?: (value: unknown) => string;
}) {
  const run = useAction();
  const type = kind(entry);
  const [draft, setDraft] = useState<string | null>(null);
  const changed = entry.defaultValue !== undefined && !same(entry.value, entry.defaultValue);
  const refresh = { refresh: [["config"], ["toolbar"]] };

  const save = (value: unknown) =>
    run(() => api.config.set(entry.interfaceName, entry.storage ?? null, entry.key, value), {
      ...refresh,
      success: "Guardado",
    });

  const text =
    draft ?? (type === "json" ? JSON.stringify(entry.value, null, 2) : String(entry.value ?? ""));

  const commit = async () => {
    if (draft === null) return;
    let value: unknown = draft;
    if (type === "number") {
      value = Number(draft);
      if (!Number.isFinite(value)) return;
    }
    if (type === "json") {
      try {
        value = JSON.parse(draft);
      } catch {
        return;
      }
    }
    await save(value);
    setDraft(null);
  };

  let jsonError = false;
  if (type === "json" && draft !== null) {
    try {
      JSON.parse(draft);
    } catch {
      jsonError = true;
    }
  }

  return (
    <div
      className={`flex flex-col gap-2 border-t border-surface-border px-5 py-3 first:border-t-0 ${type === "json" ? "" : "md:flex-row md:items-start md:gap-6"}`}
    >
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {label ?? keyLabel(entry.key)}
          {changed && <span className="h-1.5 w-1.5 rounded-full bg-sky-500" title="Cambiado" />}
        </p>
        {showInterface && (
          <p className="font-mono text-[11px] break-all text-muted">
            {shortInterface(entry.interfaceName)}.{entry.key}
          </p>
        )}
        {(hint ?? entry.docs) && <p className="mt-0.5 text-xs text-muted">{hint ?? entry.docs}</p>}
      </div>

      <div className={`flex shrink-0 items-start gap-1.5 ${type === "json" ? "" : "md:w-72"}`}>
        {type === "boolean" && (
          <div className="flex h-9 flex-1 items-center">
            <Switch checked={Boolean(entry.value)} onChange={(value) => save(value)} />
          </div>
        )}
        {type === "enum" && (
          <Select value={String(entry.value ?? "")} onChange={(event) => save(event.target.value)}>
            {entry.enumOptions!.map(([value, optionLabel]) => (
              <option key={value} value={value}>
                {optionLabel || value}
              </option>
            ))}
          </Select>
        )}
        {(type === "number" || type === "string") && (
          <form
            className="flex flex-1 flex-col gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              commit();
            }}
          >
            <Input
              type={type === "number" ? "number" : "text"}
              value={text}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              aria-label={label ?? entry.key}
            />
            {format && <span className="text-xs text-muted">{format(draft ?? entry.value)}</span>}
          </form>
        )}
        {type === "json" && (
          <div className="flex flex-1 flex-col gap-1.5">
            <Textarea
              rows={Math.min(10, Math.max(3, text.split("\n").length))}
              value={text}
              onChange={(event) => setDraft(event.target.value)}
              aria-label={label ?? entry.key}
              className={jsonError ? "border-rose-500" : ""}
            />
            {draft !== null && (
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="primary"
                  Icon={Save}
                  disabled={jsonError}
                  onClick={commit}
                >
                  Guardar
                </Button>
                <Button size="sm" onClick={() => setDraft(null)}>
                  Descartar
                </Button>
                {jsonError && (
                  <span className="self-center text-xs text-rose-500">JSON no válido</span>
                )}
              </div>
            )}
          </div>
        )}
        {changed && (
          <IconButton
            label="Volver al valor por defecto"
            Icon={RotateCcw}
            onClick={async () => {
              await run(
                () => api.config.reset(entry.interfaceName, entry.storage ?? null, entry.key),
                {
                  ...refresh,
                  success: "Valor por defecto",
                },
              );
              setDraft(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
