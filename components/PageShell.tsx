import { AppNav } from "./AppNav";

/** Shared chrome for secondary pages (nav + container + editorial header). */
export function PageShell({
  userEmail,
  eyebrow,
  title,
  intro,
  children,
}: {
  userEmail: string | null;
  eyebrow: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grain min-h-screen bg-bg text-ink">
      <div className="mx-auto w-full max-w-5xl">
        <AppNav userEmail={userEmail} />
        <header className="border-b border-line px-5 pb-6 pt-8 sm:px-8">
          <p className="font-mono text-xs uppercase tracking-widest text-mute">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-medium leading-tight sm:text-4xl">
            {title}
          </h1>
          {intro && (
            <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-mute">
              {intro}
            </p>
          )}
        </header>
        <main className="px-5 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
