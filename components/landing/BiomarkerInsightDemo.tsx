"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

type Status = "normal" | "borderline" | "critical";

type Tile = {
  id: string;
  name: string;
  value: string;
  unit: string;
  range: string;
  status: Status;
  insight: string;
};

// Status colours mirror the signed-in Biomarkers view (lib/theme palette).
const STATUS_META: Record<Status, { color: string; label: string }> = {
  normal: { color: "#10b981", label: "In range" },
  borderline: { color: "#f59e0b", label: "Borderline" },
  critical: { color: "#ef4444", label: "Out of range" },
};

// Demo biomarkers for the landing page (sample data, not a real person).
const TILES: Tile[] = [
  {
    id: "hdl",
    name: "HDL Cholesterol",
    value: "25",
    unit: "mg/dL",
    range: "40–60",
    status: "critical",
    insight:
      "Low HDL means less plaque clearance. Zone-2 cardio 3×/week raises it more reliably than any single food swap.",
  },
  {
    id: "alt",
    name: "ALT · Liver",
    value: "93",
    unit: "U/L",
    range: "7–56",
    status: "critical",
    insight:
      "A raised liver enzyme, often a sign of fatty liver. It falls quickly with weight loss and less alcohol.",
  },
  {
    id: "ldl",
    name: "LDL Cholesterol",
    value: "118",
    unit: "mg/dL",
    range: "<100",
    status: "borderline",
    insight:
      "Slightly high LDL. Soluble fibre and swapping saturated for unsaturated fats nudge it back into range.",
  },
  {
    id: "trig",
    name: "Triglycerides",
    value: "165",
    unit: "mg/dL",
    range: "<150",
    status: "borderline",
    insight:
      "Elevated triglycerides track with refined carbs and alcohol — cutting added sugar is the fastest lever.",
  },
  {
    id: "vitd",
    name: "Vitamin D",
    value: "22",
    unit: "ng/mL",
    range: "30–100",
    status: "borderline",
    insight:
      "Vitamin D is low. 10–20 min of midday sun, or 1–2k IU/day, typically restores it within weeks.",
  },
  {
    id: "hba1c",
    name: "HbA1c",
    value: "5.4",
    unit: "%",
    range: "<5.7",
    status: "normal",
    insight:
      "Average blood sugar over ~3 months is healthy — no sign of impaired glucose control.",
  },
  {
    id: "glucose",
    name: "Fasting Glucose",
    value: "92",
    unit: "mg/dL",
    range: "70–99",
    status: "normal",
    insight:
      "Fasting glucose sits comfortably in range, with no indication of insulin resistance.",
  },
  {
    id: "tsh",
    name: "TSH · Thyroid",
    value: "2.1",
    unit: "mIU/L",
    range: "0.4–4.0",
    status: "normal",
    insight:
      "Thyroid signalling is right in the sweet spot — metabolic regulation looks normal.",
  },
];

const HRV_BORDER = "#a78bfa55"; // purple AI accent, translucent

/**
 * Landing-page biomarker tiles with an "AI insight" tooltip that surfaces on
 * hover (desktop, fine pointer) or as each tile scrolls to centre (mobile).
 */
export function BiomarkerInsightDemo() {
  const [active, setActive] = useState<string | null>(null);
  const [canHover, setCanHover] = useState(false);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  // Detect a fine, hovering pointer (desktop) vs touch (mobile).
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCanHover(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // On touch devices, reveal the insight for whichever tile is near centre.
  useEffect(() => {
    if (canHover) {
      setActive(null);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) {
          setActive((visible.target as HTMLElement).dataset.id ?? null);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    Object.values(refs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [canHover]);

  return (
    <section className="px-5 pb-12 sm:px-8">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles size={14} className="text-hrv" />
        <h2 className="font-serif text-xl font-medium">Biomarkers</h2>
      </div>
      <p className="mb-4 text-xs text-mute">
        Lab values from the latest report, flagged by range.{" "}
        <span className="text-hrv">
          {canHover ? "Hover" : "Tap"} a tile for an AI insight.
        </span>
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {TILES.map((t) => {
          const meta = STATUS_META[t.status];
          const isActive = active === t.id;
          return (
            <div
              key={t.id}
              data-id={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              role="button"
              tabIndex={0}
              aria-expanded={isActive}
              onMouseEnter={() => canHover && setActive(t.id)}
              onMouseLeave={() => canHover && setActive(null)}
              onClick={() => setActive((cur) => (cur === t.id ? null : t.id))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActive((cur) => (cur === t.id ? null : t.id));
                }
              }}
              className="relative cursor-pointer outline-none"
            >
              {/* AI insight tooltip */}
              <div
                role="tooltip"
                aria-hidden={!isActive}
                className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 max-w-[85vw] -translate-x-1/2 rounded-xl border bg-panel2 p-3 text-left shadow-xl transition-all duration-200 ${
                  isActive
                    ? "translate-y-0 scale-100 opacity-100"
                    : "translate-y-1 scale-95 opacity-0"
                }`}
                style={{ borderColor: HRV_BORDER }}
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <Sparkles size={11} className="text-hrv" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-hrv">
                    AI insight
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-ink">{t.insight}</p>
                <span
                  className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r"
                  style={{ background: "#1c1c1f", borderColor: HRV_BORDER }}
                />
              </div>

              {/* Tile */}
              <div
                className="rounded-2xl border bg-panel p-4 transition-colors"
                style={{
                  borderColor: isActive ? meta.color : "#27272a",
                  boxShadow: `0 0 40px -10px ${meta.color}40, inset 0 1px 0 rgba(255, 255, 255, 0.04)`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{t.name}</span>
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: meta.color }}
                    aria-hidden
                  />
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="tnum font-mono text-2xl text-ink">{t.value}</span>
                  <span className="font-mono text-xs text-mute">{t.unit}</span>
                </div>
                <div className="mt-2 flex items-center justify-between font-mono text-xs">
                  <span className="text-mute">ref {t.range}</span>
                  <span style={{ color: meta.color }}>{meta.label}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
