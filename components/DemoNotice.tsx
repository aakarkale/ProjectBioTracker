import { Eye } from "lucide-react";

/** Banner shown on the demo account where an action would normally live. */
export function DemoNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-hrv/40 bg-hrv/5 p-4">
      <Eye size={16} className="mt-0.5 shrink-0 text-hrv" />
      <p className="text-xs leading-relaxed text-mute">
        {children ?? (
          <>
            <span className="text-ink">You&apos;re exploring the demo.</span> It&apos;s
            view-only — uploads and settings are disabled.{" "}
            <a href="/login" className="text-hrv hover:underline">
              Sign in
            </a>{" "}
            to track your own data.
          </>
        )}
      </p>
    </div>
  );
}
