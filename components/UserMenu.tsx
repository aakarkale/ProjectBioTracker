"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, HeartPulse, LogOut, Upload, UserRound } from "lucide-react";

const ITEMS = [
  { href: "/onboarding", label: "Profile & goals", icon: UserRound },
  { href: "/settings", label: "Connect health data", icon: HeartPulse },
  { href: "/upload", label: "Upload data", icon: Upload },
];

/**
 * Avatar button with a dropdown menu: profile/goals, health-data controls,
 * and sign out. Closes on outside-click or Escape.
 */
export function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (email.trim()[0] ?? "?").toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-1.5 rounded-full border border-line py-1 pl-1 pr-2 transition-colors hover:border-mute"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent font-mono text-xs font-semibold text-bg">
          {initial}
        </span>
        <ChevronDown
          size={13}
          className={`text-mute transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-panel shadow-xl"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-mute">
              Signed in as
            </p>
            <p className="truncate text-sm text-ink">{email}</p>
          </div>

          <div className="py-1">
            {ITEMS.map((it) => {
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink transition-colors hover:bg-panel2"
                >
                  <Icon size={15} className="text-mute" />
                  {it.label}
                </Link>
              );
            })}
          </div>

          <form action="/auth/signout" method="post" className="border-t border-line">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-mute transition-colors hover:bg-panel2 hover:text-heart"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
