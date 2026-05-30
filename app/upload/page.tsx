import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Uploader } from "@/components/upload/Uploader";
import { ReportHistory } from "@/components/biomarkers/ReportHistory";
import { DemoNotice } from "@/components/DemoNotice";
import { getUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { getReports } from "@/lib/queries";
import { isDemoEmail } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const user = await getUser();
  const profile = await getProfile();
  if (user && profile && !profile.onboarded) redirect("/onboarding");

  const isDemo = isDemoEmail(user?.email);
  const reports = await getReports();

  return (
    <PageShell
      userEmail={user?.email ?? null}
      eyebrow="Import"
      title="Upload data"
      intro="Bring in Apple Health daily metrics or medical reports — drop several files at once. Everything is private to your account."
    >
      {isDemo ? <DemoNotice /> : <Uploader />}
      <ReportHistory reports={reports} readOnly={isDemo} />
    </PageShell>
  );
}
