"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { saveQuestionnaire } from "@/app/questionnaire/actions";
import {
  QUESTIONNAIRE,
  type QuestionnaireAnswers,
} from "@/lib/questionnaire";

/**
 * One-question-at-a-time MCQ flow. Single-select advances automatically;
 * multi-select shows a Next button. Designed to finish in under a minute.
 */
export function QuestionnaireForm({
  initial,
  readOnly = false,
}: {
  initial?: QuestionnaireAnswers | null;
  readOnly?: boolean;
}) {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(initial ?? {});
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();

  const total = QUESTIONNAIRE.length;
  const q = QUESTIONNAIRE[step];
  const isLast = step === total - 1;
  const current = answers[q.id];

  const progress = useMemo(
    () => Math.round(((step + (current ? 1 : 0)) / total) * 100),
    [step, current, total]
  );

  function pickSingle(option: string) {
    if (readOnly) return;
    setAnswers((a) => ({ ...a, [q.id]: option }));
    // Auto-advance on single-select for speed.
    if (!isLast) setTimeout(() => setStep((s) => Math.min(s + 1, total - 1)), 140);
  }

  function toggleMulti(option: string) {
    if (readOnly) return;
    setAnswers((a) => {
      const arr = Array.isArray(a[q.id]) ? [...(a[q.id] as string[])] : [];
      // "None" is exclusive within its question.
      if (option === "None") return { ...a, [q.id]: arr.includes("None") ? [] : ["None"] };
      const without = arr.filter((x) => x !== "None");
      const next = without.includes(option)
        ? without.filter((x) => x !== option)
        : [...without, option];
      return { ...a, [q.id]: next };
    });
  }

  function finish() {
    startTransition(() => saveQuestionnaire(answers));
  }

  const selected = (option: string) =>
    q.type === "single"
      ? current === option
      : Array.isArray(current) && current.includes(option);

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div>
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-mute">
          <span>
            Question {step + 1} of {total}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-panel2">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div>
        <h2 className="font-serif text-xl font-medium leading-snug text-ink sm:text-2xl">
          {q.question}
        </h2>
        {q.hint && <p className="mt-1.5 text-xs text-mute">{q.hint}</p>}

        <div className="mt-4 grid grid-cols-1 gap-2.5">
          {q.options.map((option) => {
            const on = selected(option);
            return (
              <button
                key={option}
                type="button"
                disabled={readOnly}
                onClick={() =>
                  q.type === "single" ? pickSingle(option) : toggleMulti(option)
                }
                className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm transition-all disabled:opacity-60 ${
                  on
                    ? "border-accent bg-accent/10 text-ink"
                    : "border-line bg-panel text-ink hover:border-mute"
                }`}
              >
                <span>{option}</span>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    on ? "border-accent bg-accent text-bg" : "border-line text-transparent"
                  }`}
                >
                  <Check size={12} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex items-center gap-1.5 font-mono text-xs text-mute transition-colors hover:text-ink disabled:opacity-30"
        >
          <ArrowLeft size={13} /> Back
        </button>

        <div className="flex items-center gap-3">
          {!isLast && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
              className="flex items-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-xs font-medium text-ink transition-colors hover:border-accent"
            >
              {q.type === "multi" ? "Next" : "Skip"}
              <ArrowRight size={13} />
            </button>
          )}
          {isLast && !readOnly && (
            <button
              type="button"
              onClick={finish}
              disabled={pending}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Finish"}
            </button>
          )}
        </div>
      </div>

      {!readOnly && (
        <p className="font-mono text-[11px] text-mute">
          Optional · improves your AI recommendations · editable anytime · never shared.
        </p>
      )}
    </div>
  );
}
