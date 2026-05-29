import { RecoveryDashboard } from "@/components/dashboard/RecoveryDashboard";
import { getDailyMetrics } from "@/lib/queries";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ metrics, isSample }, user] = await Promise.all([
    getDailyMetrics(),
    getUser(),
  ]);

  return (
    <RecoveryDashboard
      data={metrics}
      isSample={isSample}
      userEmail={user?.email ?? null}
    />
  );
}
