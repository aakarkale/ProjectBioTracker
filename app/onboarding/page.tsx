import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { DemoNotice } from "@/components/DemoNotice";
import { getUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { isDemoEmail } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/onboarding");
  const isDemo = isDemoEmail(user.email);

  const profile = (await getProfile()) ?? {
    full_name: null,
    date_of_birth: null,
    sex: null,
    height_cm: null,
    weight_kg: null,
    goals: null,
    onboarded: false,
  };

  return (
    <PageShell
      userEmail={user.email ?? null}
      eyebrow="Welcome"
      title="Tell us about you"
      intro="A few quick details so your biomarker insights and recommendations are personalised to you. Takes under a minute — you can skip and finish later."
    >
      {isDemo && (
        <div className="mb-5">
          <DemoNotice>
            <span className="text-ink">Demo profile.</span> These details are
            view-only here.{" "}
            <a href="/login" className="text-hrv hover:underline">
              Sign in
            </a>{" "}
            to set up your own.
          </DemoNotice>
        </div>
      )}
      <OnboardingForm profile={profile} readOnly={isDemo} />
    </PageShell>
  );
}
