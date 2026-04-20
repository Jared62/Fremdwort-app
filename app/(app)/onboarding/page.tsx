"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "@/types";
import type { WordCategory, WordLevel, AppLanguage } from "@/types";
import { getOnboardingTestWords } from "@/lib/words";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as WordCategory[];

type Step = "interests" | "level-test-beginner" | "level-test-intermediate" | "level-test-advanced" | "language" | "done";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("interests");
  const [interests, setInterests] = useState<WordCategory[]>([]);
  const [level, setLevel] = useState<WordLevel | null>(null);
  const [language, setLanguage] = useState<AppLanguage>("de");
  const [knownBeginner, setKnownBeginner] = useState<boolean[]>([false, false, false]);
  const [knownIntermediate, setKnownIntermediate] = useState<boolean[]>([false, false, false]);
  const [knownAdvanced, setKnownAdvanced] = useState<boolean[]>([false, false, false]);
  const [saving, setSaving] = useState(false);

  const testWords = getOnboardingTestWords();

  function toggleInterest(cat: WordCategory) {
    setInterests((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function handleBeginnerResult() {
    const known = knownBeginner.filter(Boolean).length;
    if (known >= 2) {
      setStep("level-test-intermediate");
    } else {
      setLevel("beginner");
      setStep("language");
    }
  }

  function handleIntermediateResult() {
    const known = knownIntermediate.filter(Boolean).length;
    if (known >= 2) {
      setStep("level-test-advanced");
    } else {
      setLevel("intermediate");
      setStep("language");
    }
  }

  function handleAdvancedResult() {
    setLevel("advanced");
    setStep("language");
  }

  async function handleFinish() {
    if (!level) return;
    setSaving(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests, level, language, timezone }),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern.");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Konnte nicht gespeichert werden. Bitte erneut versuchen.");
    }
    setSaving(false);
  }

  // ── Step: Interests ──────────────────────────────────────────────────────
  if (step === "interests") {
    return (
      <div className="flex-1 flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground uppercase tracking-widest font-medium">Schritt 1 von 3</p>
            <h1 className="font-display text-2xl font-semibold">Deine Interessen</h1>
            <p className="text-sm text-muted-foreground">
              Wähle mindestens 3 Bereiche, aus denen du Wörter lernen möchtest.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => {
              const selected = interests.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleInterest(cat)}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-150 ${
                    selected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <span className="text-2xl">{CATEGORY_ICONS[cat]}</span>
                  <span className="text-sm font-medium leading-tight">{CATEGORY_LABELS[cat]}</span>
                </button>
              );
            })}
          </div>

          <Button
            className="w-full"
            disabled={interests.length < 3}
            onClick={() => setStep("level-test-beginner")}
          >
            Weiter {interests.length > 0 && interests.length < 3 && `(${interests.length}/3 gewählt)`}
          </Button>
        </div>
      </div>
    );
  }

  // ── Step: Level Test ────────────────────────────────────────────────────
  const levelStepConfig = {
    "level-test-beginner": {
      words: testWords.beginner,
      known: knownBeginner,
      setKnown: setKnownBeginner,
      label: "Einsteiger-Niveau",
      stepNum: "2a",
      onNext: handleBeginnerResult,
    },
    "level-test-intermediate": {
      words: testWords.intermediate,
      known: knownIntermediate,
      setKnown: setKnownIntermediate,
      label: "Fortgeschritten-Niveau",
      stepNum: "2b",
      onNext: handleIntermediateResult,
    },
    "level-test-advanced": {
      words: testWords.advanced,
      known: knownAdvanced,
      setKnown: setKnownAdvanced,
      label: "Profi-Niveau",
      stepNum: "2c",
      onNext: handleAdvancedResult,
    },
  };

  if (step in levelStepConfig) {
    const config = levelStepConfig[step as keyof typeof levelStepConfig];
    return (
      <div className="flex-1 flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground uppercase tracking-widest font-medium">Schritt 2 von 3 — {config.label}</p>
            <h1 className="font-display text-2xl font-semibold">Dein Sprachniveau</h1>
            <p className="text-sm text-muted-foreground">
              Kennst du diese Wörter und kannst sie erklären?
            </p>
          </div>

          <div className="space-y-3">
            {config.words.map((word, i) => {
              const known = config.known[i];
              return (
                <div
                  key={word.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
                >
                  <span className="font-display text-lg font-medium">{word.word}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const next = [...config.known];
                        next[i] = false;
                        config.setKnown(next);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        !known
                          ? "bg-destructive/10 text-destructive border border-destructive/30"
                          : "border border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Nein
                    </button>
                    <button
                      onClick={() => {
                        const next = [...config.known];
                        next[i] = true;
                        config.setKnown(next);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        known
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Ja
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <Button className="w-full" onClick={config.onNext}>
            Weiter
          </Button>
        </div>
      </div>
    );
  }

  // ── Step: Language ───────────────────────────────────────────────────────
  if (step === "language") {
    const levelLabels: Record<WordLevel, string> = {
      beginner: "Einsteiger",
      intermediate: "Fortgeschritten",
      advanced: "Profi",
    };
    return (
      <div className="flex-1 flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground uppercase tracking-widest font-medium">Schritt 3 von 3</p>
            <h1 className="font-display text-2xl font-semibold">Erklärungssprache</h1>
            {level && (
              <p className="text-sm text-muted-foreground">
                Dein Level: <strong>{levelLabels[level]}</strong>. In welcher Sprache sollen Definitionen erscheinen?
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(["de", "en"] as AppLanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`rounded-xl border p-6 text-center transition-all duration-150 ${
                  language === lang
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="text-3xl mb-2">{lang === "de" ? "🇩🇪" : "🇬🇧"}</div>
                <div className="font-medium">{lang === "de" ? "Deutsch" : "English"}</div>
              </button>
            ))}
          </div>

          <Button className="w-full" onClick={handleFinish} disabled={saving}>
            {saving ? "Wird gespeichert…" : "Loslegen →"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
