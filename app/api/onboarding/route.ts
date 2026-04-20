import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { WordCategory, WordLevel, AppLanguage } from "@/types";
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    interests: WordCategory[];
    level: WordLevel;
    language: AppLanguage;
    timezone: string;
  };

  const { error } = await supabase
    .from("profiles")
    .update({
      interests: body.interests,
      level: body.level,
      language: body.language,
      timezone: body.timezone,
      onboarding_completed: true,
      last_active_date: null,
      streak_count: 0,
      longest_streak: 0,
      words_seen_today: 0,
      last_word_date: null,
      category_index: 0,
    })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
