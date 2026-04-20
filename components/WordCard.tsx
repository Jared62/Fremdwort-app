"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { CATEGORY_LABELS, CATEGORY_ICONS, LEVEL_LABELS } from "@/types";
import type { Word, AppLanguage } from "@/types";

interface WordCardProps {
  word: Word;
  isReview: boolean;
  language: AppLanguage;
  wordsSeenToday: number;
  streakCount: number;
  onAction: (action: "known" | "learning_easy" | "learning_hard", newStreak: number) => void;
  onRequestNext: () => void;
  showNextButton: boolean;
}

export function WordCard({
  word,
  isReview,
  language,
  wordsSeenToday,
  streakCount,
  onAction,
  onRequestNext,
  showNextButton,
}: WordCardProps) {
  const [actionDone, setActionDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const def = language === "en" ? word.definition_en : word.definition;
  const examples = language === "en" ? word.examples_en : word.examples;
  const etymology = language === "en" ? word.etymology_en : word.etymology;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, [word.id]);

  async function handleAction(action: "known" | "learning_easy" | "learning_hard") {
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/word/${word.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.isStreakMilestone) {
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        toast.success(`🔥 ${data.newStreakCount} Tage in Folge! Beeindruckend.`);
      }

      setActionDone(true);
      onAction(action, data.newStreakCount ?? streakCount);
    } catch {
      toast.error("Aktion konnte nicht gespeichert werden.");
    }
    setSubmitting(false);
  }

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-350 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
      style={{ transition: "opacity 350ms ease-out, transform 350ms ease-out" }}
    >
      {/* Review badge */}
      {isReview && (
        <div className="text-center mb-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
            🔄 Wiederholung
          </span>
        </div>
      )}

      {/* Card */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Category + Level */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <Badge variant="secondary" className="text-xs font-medium gap-1">
            <span>{CATEGORY_ICONS[word.category]}</span>
            {CATEGORY_LABELS[word.category]}
          </Badge>
          <span className="text-xs text-muted-foreground">{LEVEL_LABELS[word.level]}</span>
        </div>

        {/* The word */}
        <div className="px-6 py-6 text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-wide leading-tight">
            {word.word}
          </h1>
        </div>

        <Separator />

        {/* Definition */}
        <div className="px-6 py-5 space-y-5">
          <p className="text-sm sm:text-base leading-relaxed text-foreground">
            {def}
          </p>

          {/* Examples */}
          <div className="space-y-2">
            {examples.map((ex, i) => (
              <p key={i} className="text-sm leading-relaxed text-muted-foreground italic pl-3 border-l-2 border-border">
                {ex}
              </p>
            ))}
          </div>

          {/* Etymology */}
          <div className="rounded-xl bg-muted/60 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Etymologie</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{etymology}</p>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="px-6 py-5 space-y-2">
          {!actionDone ? (
            <>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-11 text-sm"
                onClick={() => handleAction("known")}
                disabled={submitting}
              >
                <span className="text-base">✓</span>
                Kenn ich schon
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-11 text-sm"
                onClick={() => handleAction("learning_easy")}
                disabled={submitting}
              >
                <span className="text-base">📌</span>
                Interessant, gemerkt
                <span className="ml-auto text-xs text-muted-foreground">in 7 Tagen</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-11 text-sm"
                onClick={() => handleAction("learning_hard")}
                disabled={submitting}
              >
                <span className="text-base">🔁</span>
                Schwierig, bald wieder
                <span className="ml-auto text-xs text-muted-foreground">in 2 Tagen</span>
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground py-1">
                Gespeichert. Wort {wordsSeenToday} von 5 heute.
              </p>
              {showNextButton ? (
                <Button className="w-full" onClick={onRequestNext}>
                  Noch eins? →
                </Button>
              ) : (
                <p className="text-center text-sm font-medium text-muted-foreground">
                  Für heute genug. Bis morgen! 🌙
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
