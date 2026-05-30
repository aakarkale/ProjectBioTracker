import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type Profile = {
  full_name: string | null;
  date_of_birth: string | null;
  sex: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  goals: string | null;
  onboarded: boolean;
};

// Keep in sync with lib/demo-seed.ts
const DEMO_EMAIL = "demo@biotracker.app";

/** The signed-in user's health profile, or null if signed out / unconfigured. */
export async function getProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("full_name, date_of_birth, sex, height_cm, weight_kg, goals, onboarded")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile) ?? {
    full_name: null,
    date_of_birth: null,
    sex: null,
    height_cm: null,
    weight_kg: null,
    goals: null,
    onboarded: false,
  };
}

/**
 * The name to greet the user by. "Demo" for the demo account; the first token
 * of their profile name if set; otherwise a best-effort guess from the email.
 */
export function firstName(
  profile: Profile | null,
  email: string | null | undefined
): string {
  if (email && email.toLowerCase() === DEMO_EMAIL) return "Demo";
  const full = profile?.full_name?.trim();
  if (full) return full.split(/\s+/)[0];
  const local = (email ?? "").split("@")[0].replace(/[._-]+/g, " ").trim();
  if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  return "My";
}

/** Whole years between a YYYY-MM-DD date of birth and today. */
export function computeAge(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

/**
 * One-line plain-text summary of the profile for AI prompts. Empty string
 * when no profile fields are set.
 */
export function describeProfile(p: Profile | null): string {
  if (!p) return "";
  const parts: string[] = [];
  const age = computeAge(p.date_of_birth);
  if (age !== null) parts.push(`${age} years old`);
  if (p.sex) parts.push(p.sex);
  if (p.height_cm) parts.push(`${p.height_cm} cm`);
  if (p.weight_kg) parts.push(`${p.weight_kg} kg`);
  let line = parts.join(", ");
  if (p.goals) line += `${line ? ". " : ""}Goals: ${p.goals}`;
  return line;
}
