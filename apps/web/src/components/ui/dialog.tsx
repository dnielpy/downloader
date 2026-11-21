"use client";

import { X } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useRef } from "react";

import { IconButton } from "./button";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Buttons at the bottom; inside the form, so a submit button submits it. */
  footer?: ReactNode;
  onSubmit?: () => void;
  wide?: boolean;
};

/** A modal on the native <dialog>: focus trap, Escape and the backdrop come from the browser. */
export function Dialog({ open, onClose, title, children, footer, onSubmit, wide }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      className={`popover m-auto w-[calc(100%-2rem)] rounded-3xl p-0 text-foreground ${wide ? "max-w-3xl" : "max-w-lg"}`}
    >
      {open && (
        <form onSubmit={submit} className="flex max-h-[85vh] flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-surface-border px-5 py-3.5">
            <h2 className="font-semibold tracking-tight">{title}</h2>
            <IconButton label="Cerrar" Icon={X} onClick={onClose} />
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <footer className="flex flex-wrap justify-end gap-2 border-t border-surface-border px-5 py-3">
              {footer}
            </footer>
          )}
        </form>
      )}
    </dialog>
  );
}
