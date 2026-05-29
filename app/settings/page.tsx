import { PageShell } from "@/components/PageShell";
import { TokenManager, type TokenRow } from "@/components/settings/TokenManager";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("ingest_tokens")
    .select("id, label, created_at, last_used_at, revoked")
    .order("created_at", { ascending: false });

  const tokens = (data as TokenRow[]) ?? [];

  return (
    <PageShell
      userEmail={user?.email ?? null}
      eyebrow="Connect"
      title="Apple Health"
      intro="A website can't read Apple Health directly — HealthKit lives on your device. Generate a token below and point the Health Auto Export app (or an Apple Shortcut) at your personal webhook to sync metrics automatically."
    >
      <TokenManager tokens={tokens} />
    </PageShell>
  );
}
