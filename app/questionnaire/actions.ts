"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDemoEmail } from "@/lib/demo";
import type { QuestionnaireAnswers } from "@/lib/questionnaire";

/** Save the optional health questionnaire answers onto the user's profile. */
export async function saveQuestionnaire(
  answers: QuestionnaireAnswers
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/questionnaire");
  // Demo account is view-only — silently skip persistence.
  if (!isDemoEmail(user.email)) {
    await supabase
      .from("profiles")
      .upsert(
        { id: user.id, email: user.email, health_questionnaire: answers },
        { onConflict: "id" }
      );
  }
  redirect("/");
}
