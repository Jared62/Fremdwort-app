import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getAllWords } from "@/lib/words";
import type { ArchiveEntry } from "@/types";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: userWords, error } = await supabase
    .from("user_words")
    .select("*")
    .eq("user_id", user.id)
    .order("first_seen_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const allWords = getAllWords();
  const wordMap = new Map(allWords.map((w) => [w.id, w]));

  const entries: ArchiveEntry[] = (userWords || [])
    .map((uw) => {
      const word = wordMap.get(uw.word_id);
      if (!word) return null;
      return {
        ...word,
        status: uw.status,
        next_review_date: uw.next_review_date,
        seen_count: uw.seen_count,
        first_seen_at: uw.first_seen_at,
      };
    })
    .filter((e): e is ArchiveEntry => e !== null);

  return NextResponse.json(entries);
}
