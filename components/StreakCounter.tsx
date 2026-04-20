"use client";

import { STREAK_MILESTONES } from "@/types";

interface StreakCounterProps {
  count: number;
}

export function StreakCounter({ count }: StreakCounterProps) {
  const isMilestone = (STREAK_MILESTONES as readonly number[]).includes(count);

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium ${
        isMilestone ? "streak-milestone" : ""
      }`}
    >
      <span className="text-base">🔥</span>
      <span>{count}</span>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {count === 1 ? "Tag" : "Tage"}
      </span>
    </div>
  );
}
