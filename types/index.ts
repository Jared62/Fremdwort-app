// ─── Word (from words.json) ────────────────────────────────────────────────

export type WordLevel = "beginner" | "intermediate" | "advanced";

export type WordCategory =
  | "geopolitik"
  | "wirtschaft"
  | "philosophie"
  | "psychologie"
  | "rhetorik"
  | "naturwissenschaft"
  | "kunst"
  | "recht"
  | "technologie"
  | "medizin";

export const CATEGORY_LABELS: Record<WordCategory, string> = {
  geopolitik: "Geopolitik",
  wirtschaft: "Wirtschaft",
  philosophie: "Philosophie",
  psychologie: "Psychologie",
  rhetorik: "Rhetorik",
  naturwissenschaft: "Naturwissenschaft",
  kunst: "Kunst & Kultur",
  recht: "Recht",
  technologie: "Technologie",
  medizin: "Medizin",
};

export const CATEGORY_ICONS: Record<WordCategory, string> = {
  geopolitik: "🌍",
  wirtschaft: "📈",
  philosophie: "🧠",
  psychologie: "💭",
  rhetorik: "🗣",
  naturwissenschaft: "🔬",
  kunst: "🎨",
  recht: "⚖️",
  technologie: "💡",
  medizin: "🩺",
};

export const LEVEL_LABELS: Record<WordLevel, string> = {
  beginner: "Einsteiger",
  intermediate: "Fortgeschritten",
  advanced: "Profi",
};

export interface Word {
  id: string;
  word: string;
  category: WordCategory;
  level: WordLevel;
  definition: string;
  examples: [string, string];
  etymology: string;
  definition_en: string;
  examples_en: [string, string];
  etymology_en: string;
}

// ─── Supabase DB Types ────────────────────────────────────────────────────

export type UserStatus = "known" | "learning_easy" | "learning_hard";
export type AppLanguage = "de" | "en";

export interface Profile {
  id: string;
  interests: WordCategory[];
  level: WordLevel;
  language: AppLanguage;
  timezone: string;
  streak_count: number;
  longest_streak: number;
  last_active_date: string | null;  // ISO date string YYYY-MM-DD
  words_seen_today: number;
  last_word_date: string | null;
  category_index: number;
  onboarding_completed: boolean;
  email_reminders: boolean;
  reminder_sent_today: boolean;
  created_at: string;
}

export interface UserWord {
  id: string;
  user_id: string;
  word_id: string;
  status: UserStatus;
  next_review_date: string | null;
  seen_count: number;
  first_seen_at: string;
  updated_at: string;
}

// ─── Composite types for UI ───────────────────────────────────────────────

export interface WordWithProgress extends Word {
  userWord?: UserWord;
}

export interface ArchiveEntry extends Word {
  status: UserStatus;
  next_review_date: string | null;
  seen_count: number;
  first_seen_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────

export const STREAK_MILESTONES = [7, 30, 100] as const;

// ─── API Response Types ───────────────────────────────────────────────────

export interface TodayWordResponse {
  word: Word;
  isReview: boolean;
  wordsSeenToday: number;
  streakCount: number;
}

export interface ActionRequest {
  action: "known" | "learning_easy" | "learning_hard";
}

export interface ActionResponse {
  ok: boolean;
  newStreakCount?: number;
  isStreakMilestone?: boolean;
}
