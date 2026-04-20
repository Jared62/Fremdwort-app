import type { Profile, UserWord, Word, WordCategory, WordLevel } from "@/types";
import { getAllWords, ONBOARDING_TEST_IDS } from "./words";
import { getTodayInTz } from "./timezone";

const LEVEL_PROGRESSION: Record<WordLevel, WordLevel[]> = {
  beginner: ["beginner", "intermediate", "advanced"],
  intermediate: ["intermediate", "advanced", "beginner"],
  advanced: ["advanced", "intermediate", "beginner"],
};

export interface SelectedWord {
  word: Word;
  isReview: boolean;
}

/**
 * Selects the next word for a user based on:
 * 1. Due reviews (learning_easy / learning_hard with next_review_date <= today)
 * 2. New word from next category in round-robin (with level-unlock on exhaustion)
 * 3. Words from non-selected categories
 * 4. Recycle known words (absolute fallback)
 */
export function selectNextWord(
  profile: Profile,
  userWords: UserWord[]
): SelectedWord | null {
  const today = getTodayInTz(profile.timezone);
  const allWords = getAllWords();

  // Exclude onboarding test words from the regular pool
  const testIds = new Set([
    ...ONBOARDING_TEST_IDS.beginner,
    ...ONBOARDING_TEST_IDS.intermediate,
    ...ONBOARDING_TEST_IDS.advanced,
  ]);

  const seenIds = new Set(userWords.map((uw) => uw.word_id));
  const userWordMap = new Map(userWords.map((uw) => [uw.word_id, uw]));

  // ── 1. Due reviews ────────────────────────────────────────────────────────
  const dueReview = userWords.find(
    (uw) =>
      (uw.status === "learning_easy" || uw.status === "learning_hard") &&
      uw.next_review_date !== null &&
      uw.next_review_date <= today
  );

  if (dueReview) {
    const word = allWords.find((w) => w.id === dueReview.word_id);
    if (word) return { word, isReview: true };
  }

  // ── 2. New word via round-robin ───────────────────────────────────────────
  const interests = profile.interests as WordCategory[];
  if (interests.length === 0) return null;

  const levelProgression = LEVEL_PROGRESSION[profile.level];

  // Try each category starting from the current index
  for (let offset = 0; offset < interests.length; offset++) {
    const categoryIndex =
      (profile.category_index + offset) % interests.length;
    const category = interests[categoryIndex];

    // Try levels in progression order
    for (const level of levelProgression) {
      const candidates = allWords.filter(
        (w) =>
          w.category === category &&
          w.level === level &&
          !seenIds.has(w.id) &&
          !testIds.has(w.id)
      );

      if (candidates.length > 0) {
        return { word: candidates[0], isReview: false };
      }
    }
  }

  // ── 3. Words from non-selected categories ────────────────────────────────
  const selectedCategories = new Set(interests);
  const otherCategoryWords = allWords.filter(
    (w) =>
      !selectedCategories.has(w.category) &&
      !seenIds.has(w.id) &&
      !testIds.has(w.id)
  );

  if (otherCategoryWords.length > 0) {
    return { word: otherCategoryWords[0], isReview: false };
  }

  // ── 4. Recycle known words (absolute fallback) ────────────────────────────
  const knownWords = userWords
    .filter((uw) => uw.status === "known")
    .sort((a, b) => a.first_seen_at.localeCompare(b.first_seen_at));

  if (knownWords.length > 0) {
    const word = allWords.find((w) => w.id === knownWords[0].word_id);
    if (word) {
      // Reset it to learning so it can be reviewed
      const uw = userWordMap.get(word.id);
      if (uw) {
        // Return as review — caller will handle resetting status
        return { word, isReview: true };
      }
    }
  }

  return null;
}

/**
 * Determines how much to increment category_index after showing a new word
 * (not a review). Returns 1 for normal progression.
 */
export function nextCategoryIndex(
  profile: Profile,
  wasReview: boolean
): number {
  if (wasReview) return profile.category_index; // reviews don't advance the index
  return profile.category_index + 1;
}
