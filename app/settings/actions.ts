"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateToken, hashToken } from "@/lib/ingest";

/** Create a new ingest token; returns the plaintext ONCE (never stored). */
export async function createIngestToken(): Promise<
  { ok: true; token: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const token = generateToken();
  const { error } = await supabase.from("ingest_tokens").insert({
    user_id: user.id,
    token_hash: hashToken(token),
    label: "Apple Health",
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true, token };
}

/** Revoke (soft-disable) a token by id. */
export async function revokeIngestToken(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("ingest_tokens")
    .update({ revoked: true })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/settings");
}
