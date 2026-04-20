"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "@/types";
import type { WordCategory, AppLanguage, Profile } from "@/types";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as WordCategory[];

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interests, setInterests] = useState<WordCategory[]>([]);
  const [language, setLanguage] = useState<AppLanguage>("de");
  const [emailReminders, setEmailReminders] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p: Profile) => {
        setProfile(p);
        setInterests(p.interests ?? []);
        setLanguage(p.language ?? "de");
        setEmailReminders(p.email_reminders ?? true);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleInterest(cat: WordCategory) {
    setInterests((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleSave() {
    if (interests.length < 3) {
      toast.error("Bitte wähle mindestens 3 Interessen.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests, language, email_reminders: emailReminders }),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern.");
      toast.success("Einstellungen gespeichert.");
    } catch {
      toast.error("Konnte nicht gespeichert werden.");
    }
    setSaving(false);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-semibold">Einstellungen</h1>
        <div className="h-48 rounded-xl bg-muted/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-semibold">Einstellungen</h1>

      {/* Interests */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Interessensgebiete</h2>
          <p className="text-sm text-muted-foreground">Mindestens 3 auswählen.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => {
            const selected = interests.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleInterest(cat)}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition-all duration-150 ${
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                <span className="font-medium leading-tight text-xs">{CATEGORY_LABELS[cat]}</span>
              </button>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* Language */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Erklärungssprache</h2>
        <div className="flex gap-3">
          {(["de", "en"] as AppLanguage[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`flex-1 rounded-xl border p-4 text-center transition-all duration-150 ${
                language === lang
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="text-2xl mb-1">{lang === "de" ? "🇩🇪" : "🇬🇧"}</div>
              <div className="text-sm font-medium">{lang === "de" ? "Deutsch" : "English"}</div>
            </button>
          ))}
        </div>
      </section>

      <Separator />

      {/* Email Reminders */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">E-Mail-Erinnerungen</h2>
        <p className="text-sm text-muted-foreground">
          Wir schicken dir eine kurze Mail, wenn du bis 18 Uhr noch kein Wort gelernt hast.
        </p>
        <div className="flex gap-3">
          {[true, false].map((val) => (
            <button
              key={String(val)}
              onClick={() => setEmailReminders(val)}
              className={`flex-1 rounded-xl border p-3 text-center text-sm font-medium transition-all duration-150 ${
                emailReminders === val
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {val ? "Aktiviert" : "Deaktiviert"}
            </button>
          ))}
        </div>
      </section>

      <Button className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? "Wird gespeichert…" : "Einstellungen speichern"}
      </Button>

      <Separator />

      {/* Account info */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Konto</h2>
        {profile && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Level</span>
              <span className="font-medium capitalize">
                {profile.level === "beginner" ? "Einsteiger" : profile.level === "intermediate" ? "Fortgeschritten" : "Profi"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Längste Serie</span>
              <span className="font-medium">{profile.longest_streak} {profile.longest_streak === 1 ? "Tag" : "Tage"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mitglied seit</span>
              <span className="font-medium">
                {new Date(profile.created_at).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
              </span>
            </div>
          </div>
        )}
        <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={handleSignOut}>
          Abmelden
        </Button>
      </section>
    </div>
  );
}
