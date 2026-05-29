import Link from "next/link";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/reports", label: "Biomarkers" },
  { href: "/upload", label: "Upload" },
  { href: "/settings", label: "Connect" },
];

/**
 * Slim utility bar shown above the dashboard. Renders auth-aware actions:
 * nav + sign-out when signed in, a sign-in link in demo mode.
 */
export function AppNav({ userEmail }: { userEmail: string | null }) {
  return (
    <nav className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 sm:px-8">
      <div className="flex items-center gap-4 overflow-x-auto">
        <span className="font-mono text-xs uppercase tracking-widest text-accent">
          Bio↗
        </span>
        {userEmail &&
          LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap font-mono text-xs text-mute transition-colors hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {userEmail ? (
          <>
            <span className="hidden font-mono text-xs text-mute sm:inline">
              {userEmail}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-full border border-line px-3 py-1 font-mono text-xs text-mute transition-colors hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-full border border-accent px-3 py-1 font-mono text-xs text-accent transition-colors hover:bg-accent hover:text-bg"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
