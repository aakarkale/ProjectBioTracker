import { redirect } from "next/navigation";
import { RecoveryDashboard } from "@/components/dashboard/RecoveryDashboard";
import { EmptyDashboard } from "@/components/dashboard/EmptyDashboard";
import { getDailyMetrics } from "@/lib/queries";
import { getUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ metrics, isSample }, user] = await Promise.all([
    getDailyMetrics(),
    getUser(),
  ]);

  // New signed-in user → finish (or skip) onboarding first.
  if (user) {
    const profile = await getProfile();
    if (profile && !profile.onboarded) redirect("/onboarding");
  }

  // Signed-in user with no data yet → onboarding, never sample data.
  if (user && metrics.length === 0) {
    return <EmptyDashboard userEmail={user.email ?? null} />;
  }

  return (
    <RecoveryDashboard
      data={metrics}
      isSample={isSample}
      userEmail={user?.email ?? null}
      variant={user ? "app" : "landing"}
    />
  );
}
