/** Shared demo-account identity + helpers. */
export const DEMO_EMAIL = "demo@biotracker.app";

/** True when the email belongs to the shared, view-only demo account. */
export function isDemoEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase() === DEMO_EMAIL;
}
