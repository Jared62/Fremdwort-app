"use client";

import { useState, useEffect, useCallback } from "react";
import { WordCard } from "@/components/WordCard";
import { StreakCounter } from "@/components/StreakCounter";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import type { Word, AppLanguage } from "@/types";

interface TodayData {
  word?: Word;
  isReview?: boolean;
  wordsSeenToday: number;
  streakCount: number;
  limitReached?: boolean;
  allWordsExhausted?: boolean;
}

export default function HomePage() {
  const [data, setData] = useState<TodayData | null>(null);
  const [language, setLanguage] = useState<AppLanguage>("de");
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("language, streak_count")
      .single()
      .then(({ data: p }) => {
        if (p) {
          setLanguage(p.language as AppLanguage);
          setStreak(p.streak_count);
        }
      });
  }, []);

  const loadWord = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/word/today");
      const json = await res.json();
      setData(json);
      if (json.streakCount != null) setStreak(json.streakCount);
    } catch {
      // handle gracefully
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWord();
  }, [loadWord]);

  function handleAction(_action: string, newStreak: number) {
    setStreak(newStreak);
    setData((prev) =>
      prev ? { ...prev, wordsSeenToday: prev.wordsSeenToday + 1, streakCount: newStreak } : prev
    );
  }

  async function handleRequestNext() {
    setTransitioning(true);
    await new Promise((r) => setTimeout(r, 280));
    setData(null);
    setTransitioning(false);
    await loadWord();
  }

  const wordsSeenToday = data?.wordsSeenToday ?? 0;
  const showNextButton = wordsSeenToday < 5;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-sm font-medium tracking-widest text-muted-foreground uppercase">
            Wort des Tages
          </h2>
        </div>
        <StreakCounter count={streak} />
      </div>

      {/* Content */}
      {loading ? (
        <WordCardSkeleton />
      ) : data?.limitReached ? (
        <LimitReachedCard wordsSeenToday={wordsSeenToday} />
      ) : data?.allWordsExhausted ? (
        <AllExhaustedCard />
      ) : data?.word ? (
        <div
          className={transitioning ? "opacity-0 -translate-y-3 transition-all duration-280" : ""}
          style={{ transition: transitioning ? "opacity 280ms ease-in, transform 280ms ease-in" : "" }}
        >
          <WordCard
            word={data.word}
            isReview={data.isReview ?? false}
            language={language}
            wordsSeenToday={wordsSeenToday}
            streakCount={streak}
            onAction={handleAction}
            onRequestNext={handleRequestNext}
            showNextButton={showNextButton}
          />
        </div>
      ) : null}
    </div>
  );
}

function WordCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex justify-center py-4">
        <Skeleton className="h-12 w-56 rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="rounded-xl bg-muted/60 p-3 space-y-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function LimitReachedCard({ wordsSeenToday }: { wordsSeenToday: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center space-y-3">
      <div className="text-4xl">🌙</div>
      <h2 className="font-display text-xl font-semibold">Für heute geschafft</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Du hast heute {wordsSeenToday} Wörter gelernt. Komm morgen wieder — Beständigkeit ist der Schlüssel.
      </p>
    </div>
  );
}

function AllExhaustedCard() {
  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center space-y-3">
      <div className="text-4xl">🎓</div>
      <h2 className="font-display text-xl font-semibold">Beeindruckend</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Du hast alle verfügbaren Wörter deiner Kategorien gesehen. Füge neue Interessen hinzu, um weiterzumachen.
      </p>
    </div>
  );
}
