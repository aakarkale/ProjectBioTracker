"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfileInput = {
  date_of_birth?: string | null;
  sex?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  goals?: string | null;
};

async function persist(patch: Record<string, unknown>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  // Upsert so it works whether or not the profile row already exists.
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, email: user.email, ...patch }, { onConflict: "id" });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/** Save the onboarding profile and mark the user as onboarded. */
export async function saveProfile(input: ProfileInput): Promise<void> {
  await persist({
    date_of_birth: input.date_of_birth || null,
    sex: input.sex || null,
    height_cm: input.height_cm ?? null,
    weight_kg: input.weight_kg ?? null,
    goals: input.goals || null,
    onboarded: true,
  });
  redirect("/");
}

/** Skip onboarding for now — mark onboarded so the user isn't re-prompted. */
export async function skipOnboarding(): Promise<void> {
  await persist({ onboarded: true });
  redirect("/");
}
