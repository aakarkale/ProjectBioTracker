import { RecoveryDashboard } from "@/components/dashboard/RecoveryDashboard";
import { EmptyDashboard } from "@/components/dashboard/EmptyDashboard";
import { getDailyMetrics } from "@/lib/queries";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ metrics, isSample }, user] = await Promise.all([
    getDailyMetrics(),
    getUser(),
  ]);

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
