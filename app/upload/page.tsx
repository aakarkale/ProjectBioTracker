import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Uploader } from "@/components/upload/Uploader";
import { getUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const user = await getUser();
  const profile = await getProfile();
  if (user && profile && !profile.onboarded) redirect("/onboarding");
  return (
    <PageShell
      userEmail={user?.email ?? null}
      eyebrow="Import"
      title="Upload data"
      intro="Bring in Apple Health daily metrics or medical reports — drop several files at once. Everything is private to your account."
    >
      <Uploader />
    </PageShell>
  );
}
