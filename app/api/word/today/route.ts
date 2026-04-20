import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { selectNextWord } from "@/lib/word-selection";
import { getTodayInTz } from "@/lib/timezone";
import type { Profile, UserWord } from "@/types";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.onboarding_completed) {
    return NextResponse.json({ error: "Onboarding required" }, { status: 403 });
  }

  const today = getTodayInTz(profile.timezone);

  // Reset words_seen_today if new day
  let wordsSeen = profile.words_seen_today;
  if (profile.last_word_date !== today) {
    wordsSeen = 0;
    await supabase.from("profiles").update({ words_seen_today: 0 }).eq("id", user.id);
  }

  if (wordsSeen >= 5) {
    return NextResponse.json({ limitReached: true, wordsSeenToday: wordsSeen, streakCount: profile.streak_count });
  }

  const { data: userWords } = await supabase
    .from("user_words")
    .select("*")
    .eq("user_id", user.id);

  const selected = selectNextWord(profile as Profile, (userWords || []) as UserWord[]);
  if (!selected) {
    return NextResponse.json({ allWordsExhausted: true, wordsSeenToday: wordsSeen, streakCount: profile.streak_count });
  }

  return NextResponse.json({
    word: selected.word,
    isReview: selected.isReview,
    wordsSeenToday: wordsSeen,
    streakCount: profile.streak_count,
  });
}
