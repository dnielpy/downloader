"use client";

import { ChevronRight } from "lucide-react";
import { type ComponentType, useEffect, useLayoutEffect, useRef, useState } from "react";

export type MenuItem =
  | {
      label: string;
      Icon?: ComponentType<{ className?: string }>;
      onSelect: () => void;
      danger?: boolean;
      disabled?: boolean;
      hint?: string;
    }
  | { label: string; Icon?: ComponentType<{ className?: string }>; items: MenuItem[] }
  | "separator";

type MenuProps = {
  /** Where it opens, in viewport pixels (the click of a context menu, or under a button). */
  at: { x: number; y: number };
  items: MenuItem[];
  onClose: () => void;
};

/** A floating menu with submenus, kept inside the viewport; closes on Escape, scroll or a click outside. */
export function Menu({ at, items, onClose }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(at);

  useLayoutEffect(() => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    setPosition({
      x: Math.max(8, Math.min(at.x, window.innerWidth - box.width - 8)),
      y: Math.max(8, Math.min(at.y, window.innerHeight - box.height - 8)),
    });
  }, [at]);

  useEffect(() => {
    const down = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const key = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("keydown", key);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("keydown", key);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, []);

  return (
    <div ref={ref} className="fixed z-50" style={{ left: position.x, top: position.y }}>
      <MenuList items={items} onClose={onClose} />
    </div>
  );
}

function MenuList({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  const [open, setOpen] = useState<number | null>(null);

  const moveFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const buttons = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
        ":scope > div > button:not(:disabled)",
      ),
    ];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "ArrowDown" ? index + 1 : index - 1;
    buttons[(next + buttons.length) % buttons.length]?.focus();
  };

  return (
    <div role="menu" onKeyDown={moveFocus} className="popover min-w-52 rounded-2xl p-1.5 text-sm">
      {items.map((item, index) =>
        item === "separator" ? (
          <div key={index} className="my-1 h-px bg-surface-border" />
        ) : (
          <div
            key={index}
            className="relative"
            onMouseEnter={() => setOpen("items" in item ? index : null)}
          >
            <button
              type="button"
              role="menuitem"
              disabled={"disabled" in item && item.disabled}
              onClick={() => {
                if ("items" in item) setOpen(open === index ? null : index);
                else {
                  onClose();
                  item.onSelect();
                }
              }}
              onKeyDown={(event) => {
                if ("items" in item && event.key === "ArrowRight") setOpen(index);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left hover:bg-track focus:bg-track focus:outline-none disabled:opacity-40 ${"danger" in item && item.danger ? "text-rose-500" : ""}`}
            >
              {item.Icon ? (
                <item.Icon className="h-4 w-4 shrink-0 opacity-75" />
              ) : (
                <span className="w-4" />
              )}
              <span className="flex-1 truncate">{item.label}</span>
              {"hint" in item && item.hint && (
                <span className="text-xs text-muted">{item.hint}</span>
              )}
              {"items" in item && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
            </button>
            {"items" in item && open === index && (
              <div className="absolute top-0 left-full z-10 pl-1 max-sm:static max-sm:pl-4">
                <MenuList items={item.items} onClose={onClose} />
              </div>
            )}
          </div>
        ),
      )}
    </div>
  );
}
