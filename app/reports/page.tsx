import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { BiomarkerView } from "@/components/biomarkers/BiomarkerView";
import { getBiomarkers } from "@/lib/queries";
import { getUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { isAnthropicConfigured } from "@/lib/anthropic/client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await getUser();
  const profile = await getProfile();
  if (user && profile && !profile.onboarded) redirect("/onboarding");

  const biomarkers = await getBiomarkers();

  return (
    <PageShell
      userEmail={user?.email ?? null}
      eyebrow="Lab results"
      title="Biomarkers"
      intro="Lab values extracted from your uploaded reports. Tap a marker to see its trend over time and a personalised AI insight. Manage your uploaded reports on the Upload page."
    >
      <BiomarkerView biomarkers={biomarkers} aiEnabled={isAnthropicConfigured} />
    </PageShell>
  );
}
