import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/config";
import { DEMO_EMAIL, ensureDemoUser, seedDemo } from "@/lib/demo-seed";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * One-click demo login. Mints a session for the shared, pre-seeded demo
 * account via the service-role admin API (no email, no password) so reviewers
 * can explore the signed-in app without logging in.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  if (!isSupabaseConfigured || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.redirect(new URL("/login?error=demo", origin));
  }

  try {
    const service = createServiceClient();
    const userId = await ensureDemoUser(service);
    await seedDemo(service, userId);

    // Generate a magic-link token server-side (not emailed), then verify it on
    // the cookie-bound client to establish the session.
    const { data, error } = await service.auth.admin.generateLink({
      type: "magiclink",
      email: DEMO_EMAIL,
    });
    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) throw new Error(error?.message ?? "Could not start demo session");

    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: tokenHash,
    });
    if (verifyError) throw verifyError;

    return NextResponse.redirect(new URL("/", origin));
  } catch {
    return NextResponse.redirect(new URL("/login?error=demo", origin));
  }
}
