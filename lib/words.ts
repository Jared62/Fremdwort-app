import wordsData from "@/data/words.json";
import type { Word, WordCategory, WordLevel } from "@/types";

const words: Word[] = wordsData as Word[];

export function getAllWords(): Word[] {
  return words;
}

export function getWordById(id: string): Word | undefined {
  return words.find((w) => w.id === id);
}

export function getWordsByCategory(category: WordCategory): Word[] {
  return words.filter((w) => w.category === category);
}

export function getWordsByCategoryAndLevel(
  category: WordCategory,
  level: WordLevel
): Word[] {
  return words.filter((w) => w.category === category && w.level === level);
}

export function getOnboardingTestWords(): {
  beginner: [Word, Word, Word];
  intermediate: [Word, Word, Word];
  advanced: [Word, Word, Word];
} {
  // Fixed test words — not from the regular pool
  const beginner = words.filter(
    (w) => w.level === "beginner" && ONBOARDING_TEST_IDS.beginner.includes(w.id)
  ) as [Word, Word, Word];
  const intermediate = words.filter(
    (w) =>
      w.level === "intermediate" &&
      ONBOARDING_TEST_IDS.intermediate.includes(w.id)
  ) as [Word, Word, Word];
  const advanced = words.filter(
    (w) => w.level === "advanced" && ONBOARDING_TEST_IDS.advanced.includes(w.id)
  ) as [Word, Word, Word];

  return { beginner, intermediate, advanced };
}

// These IDs are used only for the onboarding test — never shown in the daily flow
export const ONBOARDING_TEST_IDS = {
  beginner: ["hegemonie", "sanktion", "paradox"],
  intermediate: ["epistemologie", "dialektik", "kognitiv"],
  advanced: ["solipsismus", "aporie", "hermeneutik"],
};
