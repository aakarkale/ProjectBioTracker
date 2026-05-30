"use client";

import { useState, useTransition } from "react";
import { saveProfile, skipOnboarding } from "@/app/onboarding/actions";
import type { Profile } from "@/lib/profile";

const SEXES = ["Male", "Female", "Other", "Prefer not to say"];
const GOAL_OPTIONS = [
  "Lose weight",
  "Build muscle",
  "Improve cardio fitness",
  "Better sleep",
  "Manage a condition",
  "Longevity / general health",
];

export function OnboardingForm({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition();
  const [dob, setDob] = useState(profile.date_of_birth ?? "");
  const [sex, setSex] = useState(profile.sex ?? "");
  const [height, setHeight] = useState(profile.height_cm?.toString() ?? "");
  const [weight, setWeight] = useState(profile.weight_kg?.toString() ?? "");
  const [goals, setGoals] = useState<string[]>([]);
  const [note, setNote] = useState("");

  function toggleGoal(g: string) {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function submit() {
    const goalsText = [goals.join(", "), note.trim()].filter(Boolean).join(" — ");
    startTransition(() =>
      saveProfile({
        date_of_birth: dob || null,
        sex: sex || null,
        height_cm: height ? Number(height) : null,
        weight_kg: weight ? Number(weight) : null,
        goals: goalsText || null,
      })
    );
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs transition-all ${
      active ? "border-accent bg-accent text-bg" : "border-line text-mute hover:text-ink"
    }`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="font-mono text-xs uppercase tracking-wider text-mute">
            Date of birth
          </span>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-panel px-4 py-3 font-mono text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        <div className="block">
          <span className="font-mono text-xs uppercase tracking-wider text-mute">
            Sex
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {SEXES.map((s) => (
              <button key={s} type="button" onClick={() => setSex(s)} className={chip(sex === s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="font-mono text-xs uppercase tracking-wider text-mute">
            Height (cm)
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="175"
            className="mt-1.5 w-full rounded-xl border border-line bg-panel px-4 py-3 font-mono text-sm text-ink outline-none placeholder:text-mute focus:border-accent"
          />
        </label>

        <label className="block">
          <span className="font-mono text-xs uppercase tracking-wider text-mute">
            Weight (kg)
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="78"
            className="mt-1.5 w-full rounded-xl border border-line bg-panel px-4 py-3 font-mono text-sm text-ink outline-none placeholder:text-mute focus:border-accent"
          />
        </label>
      </div>

      <div>
        <span className="font-mono text-xs uppercase tracking-wider text-mute">
          Health goals
        </span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((g) => (
            <button key={g} type="button" onClick={() => toggleGoal(g)} className={chip(goals.includes(g))}>
              {g}
            </button>
          ))}
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything else we should know? (optional)"
          className="mt-3 w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:border-accent"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save & continue"}
        </button>
        <button
          type="button"
          onClick={() => startTransition(() => skipOnboarding())}
          disabled={pending}
          className="font-mono text-xs text-mute transition-colors hover:text-ink"
        >
          Skip for now
        </button>
      </div>

      <p className="font-mono text-xs text-mute">
        Used only to personalise your insights · editable anytime · never shared.
      </p>
    </div>
  );
}
