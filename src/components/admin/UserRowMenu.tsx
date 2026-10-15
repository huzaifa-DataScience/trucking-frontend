"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type UserRowMenuItem = { label: string; onSelect: () => void; danger?: boolean; icon?: ReactNode };

/** "⋯" row menu. Rendered in a portal with fixed position so the scrolling table can't clip it. */
export function UserRowMenu({ items, label }: { items: UserRowMenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const place = () => {
      const r = buttonRef.current!.getBoundingClientRect();
      const width = 196;
      const height = menuRef.current?.offsetHeight ?? items.length * 34 + 8;
      const below = r.bottom + 4 + height <= window.innerHeight;
      setPos({ top: below ? r.bottom + 4 : r.top - height - 4, left: Math.max(8, r.right - width) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!items.length) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-[#f3f4f6] hover:text-ink ${
          open ? "bg-[#f3f4f6] text-ink" : ""
        }`}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={label}
              className="fixed z-[90] w-[196px] rounded-[10px] border border-[var(--border-subtle)] bg-white p-1 shadow-[0_10px_24px_rgba(0,0,0,0.12)]"
              style={{ top: pos.top, left: pos.left }}
            >
              {items.map((item, i) => (
                <div key={item.label}>
                  {item.danger && i > 0 ? <div className="my-1 border-t border-[var(--border-subtle)]" /> : null}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      item.onSelect();
                    }}
                    className={`cursor-pointer flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-left text-[13px] transition-colors hover:bg-[#f3f4f6] ${
                      item.danger ? "text-danger" : "text-ink"
                    }`}
                  >
                    {item.icon ? (
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center ${item.danger ? "text-danger" : "text-ink-soft"}`} aria-hidden>
                        {item.icon}
                      </span>
                    ) : null}
                    {item.label}
                  </button>
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
