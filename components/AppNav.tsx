"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "./UserMenu";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/reports", label: "Biomarkers" },
  { href: "/upload", label: "Upload" },
  { href: "/settings", label: "Connect" },
];

/**
 * Slim utility bar shown above the dashboard. Renders auth-aware actions:
 * nav + sign-out when signed in, a sign-in link in demo mode. The link for the
 * current page is highlighted.
 */
export function AppNav({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 sm:px-8">
      <div className="no-scrollbar flex items-center gap-4 overflow-x-auto">
        <span className="font-mono text-xs uppercase tracking-widest text-accent">
          Bio↗
        </span>
        {userEmail &&
          LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap font-mono text-xs transition-colors ${
                  active
                    ? "font-semibold text-accent"
                    : "text-mute hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {userEmail ? (
          <UserMenu email={userEmail} />
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
