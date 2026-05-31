import { redirect } from "next/navigation";
import { RecoveryDashboard } from "@/components/dashboard/RecoveryDashboard";
import { EmptyDashboard } from "@/components/dashboard/EmptyDashboard";
import { getDailyMetrics } from "@/lib/queries";
import { getUser } from "@/lib/auth";
import { firstName, getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ metrics, isSample }, user] = await Promise.all([
    getDailyMetrics(),
    getUser(),
  ]);

  let displayName = "My";
  if (user) {
    const profile = await getProfile();
    // New signed-in user → finish (or skip) onboarding first.
    if (profile && !profile.onboarded) redirect("/onboarding");
    displayName = firstName(profile, user.email);

    // Signed-in user with no data yet → onboarding, never sample data.
    if (metrics.length === 0) {
      return <EmptyDashboard userEmail={user.email ?? null} displayName={displayName} />;
    }
  }

  return (
    <RecoveryDashboard
      data={metrics}
      isSample={isSample}
      userEmail={user?.email ?? null}
      variant={user ? "app" : "landing"}
      displayName={displayName}
    />
  );
}
