import { RecoveryDashboard } from "@/components/dashboard/RecoveryDashboard";
import { SAMPLE_DAILY_METRICS } from "@/lib/health-data";

export default function Home() {
  // First pass: static sample data. Swap for a Supabase query when the
  // data layer lands (the DailyMetric[] contract stays the same).
  return <RecoveryDashboard data={SAMPLE_DAILY_METRICS} />;
}
