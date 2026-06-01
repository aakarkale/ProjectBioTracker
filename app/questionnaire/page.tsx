import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { QuestionnaireForm } from "@/components/questionnaire/QuestionnaireForm";
import { DemoNotice } from "@/components/DemoNotice";
import { getUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { isDemoEmail } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function QuestionnairePage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/questionnaire");
  const isDemo = isDemoEmail(user.email);

  const profile = await getProfile();
  if (profile && !profile.onboarded) redirect("/onboarding");

  return (
    <PageShell
      userEmail={user.email ?? null}
      eyebrow="Health questionnaire"
      title="A few lifestyle questions"
      intro="Optional, but it makes your AI recommendations much more accurate. Every question is multiple-choice — tap through it in under a minute."
    >
      {isDemo && (
        <div className="mb-5">
          <DemoNotice>
            <span className="text-ink">Demo questionnaire.</span> Answers are
            view-only here.{" "}
            <a href="/login" className="text-hrv hover:underline">
              Sign in
            </a>{" "}
            to set up your own.
          </DemoNotice>
        </div>
      )}
      <QuestionnaireForm
        initial={profile?.health_questionnaire ?? null}
        readOnly={isDemo}
      />
    </PageShell>
  );
}
