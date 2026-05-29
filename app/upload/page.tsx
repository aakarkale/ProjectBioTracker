import { PageShell } from "@/components/PageShell";
import { Uploader } from "@/components/upload/Uploader";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const user = await getUser();
  return (
    <PageShell
      userEmail={user?.email ?? null}
      eyebrow="Import"
      title="Upload data"
      intro="Bring in Apple Health daily metrics or a medical report. Everything is private to your account."
    >
      <Uploader />
    </PageShell>
  );
}
