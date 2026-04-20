import type { Profile } from "@/types";
import { getTodayInTz, subtractDays } from "./timezone";

export const STREAK_MILESTONES = [7, 30, 100];

export interface StreakUpdate {
  streak_count: number;
  longest_streak: number;
  last_active_date: string;
  isNewDay: boolean;
  isMilestone: boolean;
}

/**
 * Calculates streak update when user completes their first word of the day.
 * Call this only when last_active_date !== today.
 */
export function calculateStreakUpdate(profile: Profile): StreakUpdate {
  const today = getTodayInTz(profile.timezone);
  const yesterday = subtractDays(profile.timezone, 1);

  let newStreak: number;

  if (profile.last_active_date === yesterday) {
    // Consecutive day — extend streak
    newStreak = profile.streak_count + 1;
  } else {
    // Streak broken — reset
    newStreak = 1;
  }

  const newLongest = Math.max(newStreak, profile.longest_streak);
  const isMilestone = STREAK_MILESTONES.includes(newStreak);

  return {
    streak_count: newStreak,
    longest_streak: newLongest,
    last_active_date: today,
    isNewDay: true,
    isMilestone,
  };
}

/**
 * Returns true if today is a new day vs. last_active_date.
 */
export function isNewDay(profile: Profile): boolean {
  const today = getTodayInTz(profile.timezone);
  return profile.last_active_date !== today;
}
