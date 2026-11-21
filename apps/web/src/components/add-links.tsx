"use client";

import { FileUp, Link2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { api } from "@/lib/jd/api";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "@/lib/jd/types";
import { keys, useAction } from "@/lib/queries";

import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Field, Input, Select, Switch, Textarea } from "./ui/field";

const AddLinksContext = createContext<(text?: string, files?: File[]) => void>(() => {});

/** Opens the "Add links" dialog, optionally filled with text or container files. */
export function useAddLinks() {
  return useContext(AddLinksContext);
}

// Containers JDownloader decrypts; text files are read as lists of links
const CONTAINERS = [".dlc", ".ccf", ".rsdf", ".crawljob", ".nzb", ".metalink", ".torrent"];

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function readAs(file: File, as: "text" | "dataURL") {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    if (as === "text") reader.readAsText(file);
    else reader.readAsDataURL(file);
  });
}

type Options = {
  packageName: string;
  destinationFolder: string;
  extractPassword: string;
  downloadPassword: string;
  comment: string;
  priority: Priority;
  autostart: boolean;
  autoExtract: boolean;
  deepDecrypt: boolean;
  overwritePackagizerRules: boolean;
};

const DEFAULTS: Options = {
  packageName: "",
  destinationFolder: "",
  extractPassword: "",
  downloadPassword: "",
  comment: "",
  priority: "DEFAULT",
  autostart: false,
  autoExtract: true,
  deepDecrypt: false,
  overwritePackagizerRules: false,
};

export function AddLinksProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<Options>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const run = useAction();
  const router = useRouter();

  const show = useCallback((initial?: string, initialFiles?: File[]) => {
    if (initial) setText((current) => (current.trim() ? `${current.trim()}\n${initial}` : initial));
    if (initialFiles?.length) setFiles((current) => [...current, ...initialFiles]);
    setOpen(true);
  }, []);

  // Pasting links anywhere outside a text box, or dropping files on the page, opens the dialog
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      if (isEditable(event.target)) return;
      const pasted = event.clipboardData?.getData("text") ?? "";
      if (/\b(https?|ftp|magnet):/i.test(pasted)) {
        event.preventDefault();
        show(pasted);
      }
    };
    const over = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    const drop = (event: DragEvent) => {
      const dropped = [...(event.dataTransfer?.files ?? [])];
      if (!dropped.length) return;
      event.preventDefault();
      show(undefined, dropped);
    };
    window.addEventListener("paste", paste);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("paste", paste);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [show]);

  const set = <K extends keyof Options>(key: K, value: Options[K]) =>
    setOptions((current) => ({ ...current, [key]: value }));

  const close = () => {
    setOpen(false);
    setText("");
    setFiles([]);
    setOptions(DEFAULTS);
  };

  const submit = async () => {
    const query = {
      packageName: options.packageName.trim() || undefined,
      destinationFolder: options.destinationFolder.trim() || undefined,
      extractPassword: options.extractPassword || undefined,
      downloadPassword: options.downloadPassword || undefined,
      comment: options.comment.trim() || undefined,
      priority: options.priority,
      autostart: options.autostart,
      autoExtract: options.autoExtract,
      deepDecrypt: options.deepDecrypt,
      overwritePackagizerRules: options.overwritePackagizerRules,
    };
    setBusy(true);
    const done = await run(
      async () => {
        let links = text;
        const containers: string[] = [];
        for (const file of files) {
          const name = file.name.toLowerCase();
          if (CONTAINERS.some((ext) => name.endsWith(ext)))
            containers.push(await readAs(file, "dataURL"));
          else links += `\n${await readAs(file, "text")}`;
        }
        if (links.trim()) await api.grabber.addLinks(links, query);
        if (containers.length) await api.grabber.addContainers(containers, query);
        return true;
      },
      {
        success: options.autostart
          ? "Enlaces añadidos: empezarán a descargarse al comprobarse"
          : "Enlaces añadidos al LinkGrabber",
        refresh: [keys.grabber, keys.downloads],
      },
    );
    setBusy(false);
    if (done) {
      close();
      router.push(options.autostart ? "/downloads" : "/linkgrabber");
    }
  };

  const empty = !text.trim() && files.length === 0;

  return (
    <AddLinksContext.Provider value={show}>
      {children}
      <Dialog
        open={open}
        onClose={close}
        onSubmit={submit}
        title="Añadir enlaces"
        wide
        footer={
          <>
            <Button onClick={close}>Cancelar</Button>
            <Button type="submit" variant="primary" Icon={Link2} disabled={empty || busy}>
              {busy ? "Añadiendo…" : "Añadir"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field
            label="Enlaces"
            hint="Uno por línea, o texto con enlaces dentro: JDownloader los encuentra. También puedes pegar enlaces en cualquier parte de la página o soltar archivos."
          >
            <Textarea
              autoFocus
              rows={7}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="https://…"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <label className="glass inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium hover:bg-surface-hover">
              <FileUp className="h-3.5 w-3.5" />
              Contenedores o .txt
              <input
                type="file"
                multiple
                className="sr-only"
                accept={[...CONTAINERS, ".txt"].join(",")}
                onChange={(event) => {
                  setFiles((current) => [...current, ...(event.target.files ?? [])]);
                  event.target.value = "";
                }}
              />
            </label>
            {files.map((file, index) => (
              <span
                key={`${file.name}-${index}`}
                className="inline-flex items-center gap-1 rounded-full bg-track py-0.5 pr-1 pl-2.5 text-xs"
              >
                {file.name}
                <button
                  type="button"
                  aria-label={`Quitar ${file.name}`}
                  className="rounded-full p-0.5 hover:bg-surface-hover"
                  onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre del paquete" hint="Vacío: lo elige JDownloader">
              <Input
                value={options.packageName}
                onChange={(e) => set("packageName", e.target.value)}
              />
            </Field>
            <Field label="Carpeta de destino" hint="Vacío: la carpeta por defecto (/output)">
              <Input
                value={options.destinationFolder}
                placeholder="/output/…"
                onChange={(e) => set("destinationFolder", e.target.value)}
              />
            </Field>
            <Field label="Contraseña de extracción">
              <Input
                value={options.extractPassword}
                onChange={(e) => set("extractPassword", e.target.value)}
                autoComplete="off"
              />
            </Field>
            <Field label="Contraseña de descarga">
              <Input
                value={options.downloadPassword}
                onChange={(e) => set("downloadPassword", e.target.value)}
                autoComplete="off"
              />
            </Field>
            <Field label="Prioridad">
              <Select
                value={options.priority}
                onChange={(e) => set("priority", e.target.value as Priority)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Comentario">
              <Input value={options.comment} onChange={(e) => set("comment", e.target.value)} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Switch
              checked={options.autostart}
              onChange={(v) => set("autostart", v)}
              label="Descargar en cuanto se comprueben"
            />
            <Switch
              checked={options.autoExtract}
              onChange={(v) => set("autoExtract", v)}
              label="Extraer al terminar"
            />
            <Switch
              checked={options.deepDecrypt}
              onChange={(v) => set("deepDecrypt", v)}
              label="Análisis profundo (buscar enlaces dentro de páginas)"
            />
            <Switch
              checked={options.overwritePackagizerRules}
              onChange={(v) => set("overwritePackagizerRules", v)}
              label="Ignorar reglas del Packagizer"
            />
          </div>
        </div>
      </Dialog>
    </AddLinksContext.Provider>
  );
}
