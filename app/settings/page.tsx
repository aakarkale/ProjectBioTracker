import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { type TokenRow } from "@/components/settings/TokenManager";
import { ConnectWizard } from "@/components/settings/ConnectWizard";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { isDemoEmail } from "@/lib/demo";
import { DemoNotice } from "@/components/DemoNotice";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getUser();
  const profile = await getProfile();
  if (user && profile && !profile.onboarded) redirect("/onboarding");
  const isDemo = isDemoEmail(user?.email);
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
      title="Connect health data"
      intro="Sync your Apple Health or Android (Health Connect) data into BioTracker. Answer a couple of quick questions and we'll show you the exact steps for your phone."
    >
      {isDemo ? (
        <DemoNotice>
          <span className="text-ink">You&apos;re exploring the demo.</span>{" "}
          Connecting health data is disabled here.{" "}
          <a href="/login" className="text-hrv hover:underline">
            Sign in
          </a>{" "}
          to set up your own sync.
        </DemoNotice>
      ) : (
        <ConnectWizard tokens={tokens} />
      )}
    </PageShell>
  );
}
