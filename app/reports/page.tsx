import { PageShell } from "@/components/PageShell";
import { BiomarkerView } from "@/components/biomarkers/BiomarkerView";
import { getBiomarkers } from "@/lib/queries";
import { getUser } from "@/lib/auth";
import { isAnthropicConfigured } from "@/lib/anthropic/client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [user, biomarkers] = await Promise.all([getUser(), getBiomarkers()]);

  return (
    <PageShell
      userEmail={user?.email ?? null}
      eyebrow="Lab results"
      title="Biomarkers"
      intro="Lab values extracted from your uploaded reports, with reference ranges and status. Generate AI recommendations that fold in your recent activity."
    >
      <BiomarkerView biomarkers={biomarkers} aiEnabled={isAnthropicConfigured} />
    </PageShell>
  );
}
