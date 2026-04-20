"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_LABELS, CATEGORY_ICONS, LEVEL_LABELS } from "@/types";
import type { ArchiveEntry, AppLanguage, UserStatus } from "@/types";

const STATUS_LABELS: Record<UserStatus, string> = {
  known: "Gelernt",
  learning_easy: "Wiederholen (7 Tage)",
  learning_hard: "Wiederholen (2 Tage)",
};

const STATUS_COLORS: Record<UserStatus, string> = {
  known: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  learning_easy: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  learning_hard: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

type FilterTab = "all" | "known" | "learning";

export default function ArchivePage() {
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [language, setLanguage] = useState<AppLanguage>("de");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selected, setSelected] = useState<ArchiveEntry | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("profiles").select("language").single().then(({ data }) => {
      if (data) setLanguage(data.language as AppLanguage);
    });

    fetch("/api/archive")
      .then((r) => r.json())
      .then((data) => setEntries(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = entries;
    if (filter === "known") result = result.filter((e) => e.status === "known");
    if (filter === "learning") result = result.filter((e) => e.status !== "known");
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.word.toLowerCase().includes(q));
    }
    return result;
  }, [entries, filter, search]);

  const counts = useMemo(() => ({
    all: entries.length,
    known: entries.filter((e) => e.status === "known").length,
    learning: entries.filter((e) => e.status !== "known").length,
  }), [entries]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Archiv</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {counts.all} Wörter gesehen · {counts.known} gelernt
        </p>
      </div>

      {/* Search */}
      <Input
        placeholder="Wort suchen…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-card"
      />

      {/* Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">Alle ({counts.all})</TabsTrigger>
          <TabsTrigger value="known" className="flex-1">Gelernt ({counts.known})</TabsTrigger>
          <TabsTrigger value="learning" className="flex-1">Am Lernen ({counts.learning})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {entries.length === 0
              ? "Noch keine Wörter gelernt. Starte mit dem Wort des Tages!"
              : "Kein Eintrag gefunden."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setSelected(entry)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display font-medium text-base">{entry.word}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[entry.status]}`}>
                  {entry.status === "known" ? "✓ Gelernt" : "↻ Wiederholen"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {CATEGORY_ICONS[entry.category]} {CATEGORY_LABELS[entry.category]}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{LEVEL_LABELS[entry.level]}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="text-left pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">
                    {CATEGORY_ICONS[selected.category]} {CATEGORY_LABELS[selected.category]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{LEVEL_LABELS[selected.level]}</span>
                </div>
                <SheetTitle className="font-display text-3xl font-semibold">
                  {selected.word}
                </SheetTitle>
                <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[selected.status]}`}>
                  {STATUS_LABELS[selected.status]}
                </span>
              </SheetHeader>

              <Separator className="my-4" />

              <div className="space-y-4 pb-6">
                <p className="text-sm leading-relaxed">
                  {language === "en" ? selected.definition_en : selected.definition}
                </p>
                <div className="space-y-2">
                  {(language === "en" ? selected.examples_en : selected.examples).map((ex, i) => (
                    <p key={i} className="text-sm text-muted-foreground italic pl-3 border-l-2 border-border leading-relaxed">
                      {ex}
                    </p>
                  ))}
                </div>
                <div className="rounded-xl bg-muted/60 px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Etymologie</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {language === "en" ? selected.etymology_en : selected.etymology}
                  </p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
