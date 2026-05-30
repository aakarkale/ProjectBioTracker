"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

const HRV_BORDER = "#a78bfa55";

/**
 * Wraps an element with an explanatory tooltip — used only in the demo view.
 * Reveals on hover (fine pointer / desktop) or as it scrolls to the centre of
 * the viewport (touch / mobile); tap toggles. When `enabled` is false it
 * renders children untouched (no wrapper, no layout change).
 */
export function DemoTip({
  tip,
  enabled,
  children,
}: {
  tip: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCanHover(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || canHover) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => setActive(e.isIntersecting)),
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [enabled, canHover]);

  if (!enabled) return <>{children}</>;

  return (
    <div
      ref={ref}
      className="relative h-full"
      onMouseEnter={() => canHover && setActive(true)}
      onMouseLeave={() => canHover && setActive(false)}
      onClick={() => setActive((v) => !v)}
    >
      {children}
      <div
        role="tooltip"
        aria-hidden={!active}
        className={`pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-60 max-w-[85vw] -translate-x-1/2 rounded-xl border bg-panel2 p-3 text-left shadow-xl transition-all duration-200 ${
          active ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-95 opacity-0"
        }`}
        style={{ borderColor: HRV_BORDER }}
      >
        <div className="mb-1 flex items-center gap-1.5">
          <Sparkles size={11} className="text-hrv" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-hrv">
            What this means
          </span>
        </div>
        <p className="text-xs leading-relaxed text-ink">{tip}</p>
        <span
          className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r"
          style={{ background: "#1c1c1f", borderColor: HRV_BORDER }}
        />
      </div>
    </div>
  );
}
