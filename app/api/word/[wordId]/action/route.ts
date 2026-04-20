import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculateStreakUpdate, isNewDay } from "@/lib/streak";
import { nextCategoryIndex } from "@/lib/word-selection";
import { addDaysToDate, getTodayInTz } from "@/lib/timezone";
import type { Profile, UserStatus } from "@/types";

const ACTION_TO_STATUS: Record<string, UserStatus> = {
  known: "known",
  learning_easy: "learning_easy",
  learning_hard: "learning_hard",
};

const ACTION_TO_DAYS: Record<string, number | null> = {
  known: null,
  learning_easy: 7,
  learning_hard: 2,
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ wordId: string }> }
) {
  const { wordId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { action: string };
  const status = ACTION_TO_STATUS[body.action];
  if (!status) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const today = getTodayInTz(profile.timezone);
  const days = ACTION_TO_DAYS[body.action];
  const next_review_date = days !== null ? addDaysToDate(today, days) : null;

  // Upsert user_words
  const { data: existing } = await supabase
    .from("user_words")
    .select("id, seen_count")
    .eq("user_id", user.id)
    .eq("word_id", wordId)
    .single();

  if (existing) {
    await supabase
      .from("user_words")
      .update({
        status,
        next_review_date,
        seen_count: existing.seen_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("user_words").insert({
      user_id: user.id,
      word_id: wordId,
      status,
      next_review_date,
      seen_count: 1,
    });
  }

  // Update profile: words_seen_today, last_word_date, category_index
  const wasNew = !existing;
  const newCategoryIndex = nextCategoryIndex(profile as Profile, !wasNew);
  const newWordsSeen =
    profile.last_word_date !== today ? 1 : profile.words_seen_today + 1;

  // Streak
  let streakUpdate = {};
  let isMilestone = false;
  if (isNewDay(profile as Profile)) {
    const update = calculateStreakUpdate(profile as Profile);
    streakUpdate = {
      streak_count: update.streak_count,
      longest_streak: update.longest_streak,
      last_active_date: update.last_active_date,
    };
    isMilestone = update.isMilestone;
  }

  await supabase
    .from("profiles")
    .update({
      words_seen_today: newWordsSeen,
      last_word_date: today,
      category_index: newCategoryIndex,
      ...streakUpdate,
    })
    .eq("id", user.id);

  const updatedStreak = (streakUpdate as { streak_count?: number }).streak_count ?? profile.streak_count;

  return NextResponse.json({
    ok: true,
    newStreakCount: updatedStreak,
    isStreakMilestone: isMilestone,
  });
}
