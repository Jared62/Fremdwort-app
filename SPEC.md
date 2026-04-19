# Fremdwort App — Product Specification

**Version:** 1.0  
**Datum:** 2026-04-19  
**Status:** Bereit zur Implementierung

---

## 1. Produktvision

Eine tägliche Lern-App für bildungshungrige Menschen, die ihren aktiven Wortschatz mit echten Fremdwörtern und Fachbegriffen aus ihrer Interessenswelt erweitern wollen. Der Rhythmus ist bewusst langsam gehalten (max. 5 Wörter pro Tag), um nachhaltige Retention statt Bulimie-Lernen zu fördern.

---

## 2. Tech Stack

| Komponente       | Technologie                              |
|------------------|------------------------------------------|
| Framework        | Next.js 14 (App Router) + TypeScript     |
| Styling          | Tailwind CSS + shadcn/ui                 |
| Auth + Datenbank | Supabase (Email/Passwort + Google OAuth) |
| Email            | Resend                                   |
| Deployment       | Vercel                                   |
| Package Manager  | pnpm                                     |

---

## 3. Datenbankschema (Supabase)

### 3.1 Tabelle: `profiles`

Erweitert `auth.users`. Wird per Trigger bei Signup automatisch angelegt.

```sql
CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  interests           TEXT[]    NOT NULL DEFAULT '{}',
  level               TEXT      NOT NULL DEFAULT 'beginner'
                        CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  language            TEXT      NOT NULL DEFAULT 'de'
                        CHECK (language IN ('de', 'en')),
  timezone            TEXT      NOT NULL DEFAULT 'Europe/Berlin',
  streak_count        INT       NOT NULL DEFAULT 0,
  longest_streak      INT       NOT NULL DEFAULT 0,
  last_active_date    DATE,
  words_seen_today    INT       NOT NULL DEFAULT 0,
  last_word_date      DATE,
  category_index      INT       NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN  NOT NULL DEFAULT FALSE,
  email_reminders     BOOLEAN   NOT NULL DEFAULT TRUE,
  reminder_sent_today BOOLEAN   NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 3.2 Tabelle: `user_words`

Speichert den Lernfortschritt pro User pro Wort.

```sql
CREATE TABLE user_words (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id          TEXT    NOT NULL,  -- ID aus words.json
  status           TEXT    NOT NULL
                     CHECK (status IN ('known', 'learning_easy', 'learning_hard')),
  next_review_date DATE,              -- NULL wenn status = 'known'
  seen_count       INT     NOT NULL DEFAULT 1,
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, word_id)
);

ALTER TABLE user_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own word progress" ON user_words
  FOR ALL USING (auth.uid() = user_id);

-- Index für performante Abfragen
CREATE INDEX idx_user_words_user_review ON user_words(user_id, next_review_date)
  WHERE status != 'known';
```

---

## 4. Datenbasis: `words.json`

### 4.1 Struktur pro Wort

```json
{
  "id": "hegemonie",
  "word": "Hegemonie",
  "category": "geopolitik",
  "level": "intermediate",
  "definition": "Die politische, wirtschaftliche oder militärische Vorherrschaft eines Staates oder einer Gruppe über andere.",
  "examples": [
    "Die Hegemonie der USA im 20. Jahrhundert formte die globale Weltordnung entscheidend.",
    "China strebt nach regionaler Hegemonie im Südchinesischen Meer."
  ],
  "etymology": "Aus dem Griechischen hēgemonia (ἡγεμονία), abgeleitet von hēgemon (Führer, Anführer). Im 19. Jahrhundert wurde der Begriff von marxistischen Theoretikern, besonders Antonio Gramsci, für kulturelle und ideologische Vorherrschaft erweitert.",
  "definition_en": "The political, economic, or military dominance of one state or group over others.",
  "examples_en": [
    "U.S. hegemony in the 20th century significantly shaped the global world order.",
    "China is pursuing regional hegemony in the South China Sea."
  ],
  "etymology_en": "From the Greek hēgemonia (ἡγεμονία), derived from hēgemon (leader, commander). In the 19th century, Marxist theorists—especially Antonio Gramsci—expanded the term to include cultural and ideological dominance."
}
```

### 4.2 Verteilung (mind. 300 Wörter)

| Kategorie       | key            | Wörter |
|-----------------|----------------|--------|
| Geopolitik      | `geopolitik`   | 30     |
| Wirtschaft      | `wirtschaft`   | 30     |
| Philosophie     | `philosophie`  | 30     |
| Psychologie     | `psychologie`  | 30     |
| Rhetorik        | `rhetorik`     | 30     |
| Naturwissenschaft | `naturwissenschaft` | 30 |
| Kunst & Kultur  | `kunst`        | 30     |
| Recht           | `recht`        | 30     |
| Technologie     | `technologie`  | 30     |
| Medizin         | `medizin`      | 30     |

Pro Kategorie: ~10 beginner, ~12 intermediate, ~8 advanced.

Qualitätsstandard: Echte Fremd- und Fachworte, die gebildete Menschen kennen sollten. Keine Alltagsworte. Beispiele guter Wörter: Hegemonie, Epistemologie, Causa sui, Hermeneutik, Dichotomie, Obsoleszenz, Solipsismus, Exegese, Kognitive Dissonanz, Habitus, Diskurs, Aporie, Tautologie, Syllogismus, Simonie, Promulgation, Subsidiarität, Klientelismus.

---

## 5. Onboarding-Flow (einmalig nach Signup)

### Schritt 1 — Interessensgebiete

- Multi-Select Grid mit allen 10 Kategorien (Icons + Labels)
- Mindestens 3 müssen gewählt werden, sonst ist "Weiter" deaktiviert
- Ausgewählte Kategorien werden visuell highlighted

### Schritt 2 — Level-Selbsttest (Progressiv)

**Ablauf:**

1. Zeige 3 repräsentative Beginner-Wörter (nur das Wort, keine Definition)
   - Frage: "Kennst du diese Wörter und kannst sie erklären?"
   - User klickt für jedes: ✓ (Ja) oder ✗ (Nein)
2. Wenn ≥ 2/3 bekannt → weiter zu Intermediate-Test
   - Wenn < 2/3 bekannt → Level = `beginner`, Test abgeschlossen
3. Zeige 3 Intermediate-Wörter
   - Wenn ≥ 2/3 bekannt → weiter zu Advanced-Test
   - Wenn < 2/3 bekannt → Level = `intermediate`, Test abgeschlossen
4. Zeige 3 Advanced-Wörter
   - Wenn ≥ 2/3 bekannt → Level = `advanced`
   - Wenn < 2/3 bekannt → Level = `advanced` (bereits das höchste getestet)

**Wichtig:** Die 9 Test-Wörter sind fest kodiert (nicht aus dem regulären Wortpool), damit sie nicht als "gesehen" in `user_words` eingetragen werden. Sie sind repräsentative Musterworte ausschließlich für das Onboarding.

**Feedback nach dem Test:** Kurze Bestätigung des ermittelten Levels mit einem erklärenden Satz (z.B. "Du startest auf Fortgeschritten-Niveau — wir zeigen dir Begriffe, die auch Experten täglich nutzen.").

### Schritt 3 — Sprache der Erklärung

- Zwei Buttons: 🇩🇪 Deutsch / 🇬🇧 English
- Default: Deutsch

### Schritt 4 — Completion

- Kurze Willkommens-Animation
- Direkt redirect auf `/` (tägliches Wort)
- `onboarding_completed = TRUE` in profiles

---

## 6. Wort-Auswahl-Algorithmus

### Prioritätskaskade (wird bei jedem "Wort abrufen" durchlaufen)

```
1. Fällige Wiederholungen prüfen
   → user_words WHERE user_id = $uid
                   AND status IN ('learning_easy', 'learning_hard')
                   AND next_review_date <= TODAY
   → Erste fällige Wiederholung anzeigen

2. Falls keine fälligen Wiederholungen:
   → Nächste Kategorie per Round-Robin: interests[category_index % interests.length]
   → Wörter aus words.json WHERE category = currentCategory AND level = user.level
   → Filtere heraus: alle word_ids aus user_words (bereits gesehen)
   → Wähle erstes verbleibendes Wort (sortiert nach ID für Determinismus)
   → category_index += 1 (in profiles speichern)

3. Falls aktuelle Kategorie erschöpft (keine neuen Wörter):
   → Level-Unlock für diese Kategorie:
     - beginner → zeige auch intermediate
     - intermediate → zeige auch advanced
     - advanced → nimm nächste Kategorie (keine bekannten zurück)
   → Wenn alle Level dieser Kategorie erschöpft: überspringe zur nächsten Kategorie

4. Absoluter Fallback (alle gewählten Kategorien + Level erschöpft):
   → Words aus anderen (nicht gewählten) Kategorien, matching level
   → Wenn auch das leer: Zeige Glückwunsch-Screen + Möglichkeit alle bekannten
     Wörter zu resetten oder neue Kategorien hinzuzufügen
```

### Tages-Limit

- `words_seen_today` in profiles, `last_word_date` für Reset-Logik
- Bei jedem API-Call: wenn `last_word_date < today` → `words_seen_today = 0`
- Maximum: 5 Wörter pro Tag
- Bei Erreichen: Motivations-Screen ("Für heute geschafft. Morgen geht's weiter.")

---

## 7. Täglicher Lern-Flow

### Word Card Aufbau

```
┌─────────────────────────────────────┐
│  [Streak Counter]      [Archiv-Icon] │
│                                     │
│  [Kategorie-Chip]  [Level-Badge]    │
│                                     │
│        Das Fremdwort                │
│     (Serif, groß, zentriert)        │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Definition                         │
│  (Sans-serif, 1-2 Sätze)           │
│                                     │
│  Anwendungsbeispiele                │
│  • Beispiel 1                       │
│  • Beispiel 2                       │
│                                     │
│  Etymologie                         │
│  (kleinere Schrift, Akzentfarbe)   │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  [Kenn ich schon]                   │
│  [Interessant, gemerkt]             │
│  [Schwierig, bald wieder]           │
└─────────────────────────────────────┘
```

### Button-Aktionen

| Button | Status | next_review_date |
|--------|--------|-----------------|
| "Kenn ich schon" | `known` | NULL |
| "Interessant, gemerkt" | `learning_easy` | today + 7 Tage |
| "Schwierig, bald wieder" | `learning_hard` | today + 2 Tage |

**Sonderfall Wiederholung:** Wird ein Wort wiederholt (bereits in user_words) und als "Kenn ich schon" markiert → Status zu `known`, `next_review_date = NULL`.

### "Noch eins?"-Flow

- Nach Button-Klick: sanfter Slide-out der aktuellen Card
- Anzeige: "Wort 1 von max. 5 heute" + "Noch eins?"-Button + kleines Fortschritts-Indikator
- Klick auf "Noch eins?" → nächstes Wort nach Algorithmus laden
- Kein "Noch eins?" wenn `words_seen_today >= 5`
- User kann auch einfach die Seite verlassen (kein Zwang)

---

## 8. Spaced Repetition

### Bucket-Logik

```
Neu gesehen:
  → "Schwierig"     → learning_hard  → +2 Tage
  → "Interessant"   → learning_easy  → +7 Tage
  → "Kenn ich"      → known          → nie wieder

Wiederholung (Wort bereits in user_words):
  → "Schwierig"     → learning_hard  → +2 Tage, seen_count++
  → "Interessant"   → learning_easy  → +7 Tage, seen_count++
  → "Kenn ich"      → known          → NULL, seen_count++
```

### Datums-Berechnung

Alle Datumsoperationen server-seitig mit der gespeicherten User-Timezone. `next_review_date` ist immer ein `DATE` (ohne Uhrzeit), Vergleich gegen `CURRENT_DATE AT TIME ZONE user.timezone`.

---

## 9. Streak-System

### Berechnung

```typescript
function updateStreak(profile: Profile, today: Date): Partial<Profile> {
  const todayStr = formatDate(today, profile.timezone); // 'YYYY-MM-DD'
  const lastActive = profile.last_active_date;

  if (lastActive === todayStr) {
    // Bereits heute aktiv — nichts ändern
    return {};
  }

  const yesterday = subtractDays(today, 1, profile.timezone);

  if (lastActive === yesterday) {
    // Streak fortsetzen
    const newStreak = profile.streak_count + 1;
    return {
      streak_count: newStreak,
      longest_streak: Math.max(newStreak, profile.longest_streak),
      last_active_date: todayStr,
    };
  }

  // Streak unterbrochen
  return {
    streak_count: 1,
    last_active_date: todayStr,
  };
}
```

### Streak-Update Trigger

Wird aufgerufen wenn User einen der 3 Action-Buttons klickt (erster Klick des Tages reicht).

### Meilenstein-Animationen

Bei `streak_count` = 7, 30, 100: Konfetti-Animation mit shadcn/ui `Dialog` oder `Toast`. Nachfolgende Tage keine Animation (nur beim Erreichen).

### Timezone

Beim ersten Login wird `Intl.DateTimeFormat().resolvedOptions().timeZone` ausgelesen und in `profiles.timezone` gespeichert. Alle Streak-Berechnungen auf dem Server nutzen diesen gespeicherten Wert.

---

## 10. Archiv-Seite (`/archive`)

### Features

- Liste aller gesehenen Wörter aus `user_words` + `words.json`
- Filter-Tabs: Alle / Gelernt (known) / Wiederholen (learning_easy + learning_hard)
- Suchfeld: Echtzeit-Filterung nach Wortname (client-side)
- Pro Eintrag: Wort, Kategorie-Chip, Level-Badge, Status-Icon, Datum
- Klick auf Eintrag: Aufklapp-Ansicht mit voller Definition (Accordion oder Sheet)
- Sortierung: Neueste zuerst (by `first_seen_at`)

---

## 11. Settings-Seite (`/settings`)

### Editierbare Felder

1. **Interessensgebiete** — Multi-Select (identische UI wie Onboarding Schritt 1)
   - Wenn Kategorien entfernt werden: bestehende user_words in diesen Kategorien bleiben erhalten
   - `category_index` wird auf 0 zurückgesetzt nach Änderung
2. **Erklärungssprache** — Toggle DE / EN
3. **Email-Erinnerungen** — Toggle on/off
   - Wenn aktiviert: kurze Erklärung "Wir erinnern dich um ~18 Uhr, falls du dein Wort noch nicht gelernt hast."

### Nicht editierbar

- Level (wird nach Onboarding fest gesetzt; bei Bedarf können Nutzer das Onboarding nach eigenem Ermessen nicht erneut starten — kein Reset-Flow vorgesehen)
- Passwort-Änderung (über Supabase Auth direkt / "Forgot Password"-Flow)

---

## 12. Email-Erinnerungen

### Architektur

- **Provider:** Resend (`resend` npm package)
- **Trigger:** Vercel Cron, läuft jede Stunde (`0 * * * *`)
- **Route:** `POST /api/cron/remind` (geschützt via `CRON_SECRET` Header)

### Cron-Logik

```typescript
// /api/cron/remind/route.ts
// Läuft jede Stunde.
// Filtert User, bei denen gerade 18:00 Uhr in ihrer Timezone ist
// UND today kein Wort gelernt wurde (last_word_date < today)
// UND email_reminders = true
// UND reminder_sent_today = false

// Nach Versand: reminder_sent_today = true setzen
// Jeden Tag um Mitternacht UTC: alle reminder_sent_today → false resetten
// (separater Cron: 0 0 * * * → /api/cron/reset-reminders)
```

### Email-Template

Einfaches transaktionales Email:
- Subject: "Dein Fremdwort des Tages wartet auf dich"
- Body: Name, Streak-Info, CTA-Button zur App
- Kein Wort im Email (User soll die App öffnen)
- Plain-Text + HTML Version

### Timezone-Matching

```typescript
function isReminderHour(timezone: string): boolean {
  const now = new Date();
  const localHour = parseInt(
    new Intl.DateTimeFormat('en', { hour: 'numeric', hour12: false, timeZone: timezone })
      .format(now)
  );
  return localHour === 18;
}
```

---

## 13. API Routes

| Route | Methode | Beschreibung |
|-------|---------|-------------|
| `/api/word/today` | GET | Nächstes Wort nach Algorithmus |
| `/api/word/[wordId]/action` | POST | Button-Aktion (known/easy/hard) |
| `/api/onboarding` | POST | Onboarding-Daten speichern |
| `/api/profile` | GET/PATCH | Profil lesen/updaten |
| `/api/archive` | GET | Alle user_words mit Word-Daten |
| `/api/cron/remind` | POST | Stündlicher Reminder-Cron |
| `/api/cron/reset-reminders` | POST | Täglicher Reset |

Alle App-Routes sind per Supabase Server-Client geschützt (session-check per Middleware).

---

## 14. Dateistruktur

```
fremdwort-app/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx          ← Auth-Guard + Onboarding-Redirect
│   │   ├── page.tsx            ← Tägliches Wort (/)
│   │   ├── onboarding/
│   │   │   └── page.tsx
│   │   ├── archive/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── api/
│   │   ├── word/
│   │   │   ├── today/route.ts
│   │   │   └── [wordId]/action/route.ts
│   │   ├── onboarding/route.ts
│   │   ├── profile/route.ts
│   │   ├── archive/route.ts
│   │   └── cron/
│   │       ├── remind/route.ts
│   │       └── reset-reminders/route.ts
│   ├── globals.css
│   └── layout.tsx              ← Root-Layout (Fonts, Theme-Provider)
├── components/
│   ├── ui/                     ← shadcn/ui Komponenten
│   ├── WordCard.tsx
│   ├── WordCardSkeleton.tsx
│   ├── ActionButtons.tsx
│   ├── StreakCounter.tsx
│   ├── DailyProgress.tsx       ← "Wort X von 5"
│   ├── MilestoneModal.tsx
│   ├── OnboardingInterests.tsx
│   ├── OnboardingLevelTest.tsx
│   ├── ArchiveList.tsx
│   └── ArchiveSearch.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           ← Browser-Client
│   │   └── server.ts           ← Server-Client (Cookies)
│   ├── word-selection.ts       ← Algorithmus-Logik
│   ├── streak.ts               ← Streak-Berechnungen
│   ├── timezone.ts             ← Timezone-Utilities
│   └── words.ts                ← words.json laden + typisieren
├── data/
│   └── words.json
├── types/
│   └── index.ts                ← Word, Profile, UserWord Types
├── middleware.ts               ← Supabase Auth Session Refresh
├── vercel.json                 ← Cron Job Konfiguration
├── .env.local.example
├── SPEC.md
└── README.md
```

---

## 15. Design-System

### Fonts

```css
/* Serif für das Fremdwort */
font-family: 'Playfair Display', Georgia, serif;

/* Sans-serif für alles andere */
font-family: 'Inter', system-ui, sans-serif;
```

### Farbpalette

```
Light Mode:
  Background:  #FAFAF8  (warmes Off-White)
  Surface:     #FFFFFF
  Text:        #1A1A1A
  Accent:      #2D5016  (tiefes Waldgrün)
  Muted:       #6B7280
  Border:      #E5E7EB

Dark Mode:
  Background:  #0F0F0E
  Surface:     #1A1A18
  Text:        #F5F5F0
  Accent:      #86EFAC  (helles Grün)
  Muted:       #9CA3AF
  Border:      #2D2D2B
```

### Typografie-Hierarchie

```
Fremdwort:       3rem / 700 weight / Playfair Display / letter-spacing: -0.02em
Kategorie-Chip:  0.75rem / 500 weight / Inter / uppercase / tracking-wide
Definition:      1rem / 400 weight / Inter / line-height: 1.75
Beispiele:       0.9375rem / 400 weight / Inter / italic
Etymologie:      0.875rem / 400 weight / Inter / Akzentfarbe
```

### Komponenten-Prinzipien

- **Kein verspieltes Design:** Keine Gamification-Icons außer Streak-Flame
- **Viel Whitespace:** Padding großzügig, kein vollgepacktes Layout
- **Mobile-first:** Cards auf dem Handy nehmen volle Breite ein, max-width: 640px auf Desktop zentriert
- **Smooth Transitions:**
  - Word Card: `transform: translateY` + `opacity` fade bei Wechsel (300ms ease-out)
  - Buttons: subtle scale + color transition (150ms)
  - Streak-Milestone: Konfetti via `canvas-confetti`

---

## 16. Auth-Flow

### Signup

1. Email + Passwort oder Google OAuth
2. Supabase sendet Bestätigungsmail (Redirect: `/onboarding`)
3. Nach Bestätigung: Profil-Trigger erstellt leeres `profiles`-Row
4. Redirect zu `/onboarding`

### Login

1. Session wird per Supabase Cookie-Auth gehalten
2. `middleware.ts` refresht Session bei jedem Request
3. Unauthentifizierte Requests auf `/(app)/*` → Redirect zu `/login`
4. Nach erfolgreichem Login: Redirect zu `/` (tägliches Wort)
5. Falls `onboarding_completed = false` → Redirect zu `/onboarding`

### Google OAuth

- In Supabase Dashboard: Google Provider aktivieren
- OAuth Callback: `/auth/callback` (Supabase Standard-Route)
- Gleiches Onboarding wie Email-Signup

---

## 17. Vercel Cron Konfiguration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/remind",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/reset-reminders",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Beide Routes prüfen `Authorization: Bearer ${CRON_SECRET}` Header.

---

## 18. Environment Variables

```bash
# .env.local.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # Nur server-seitig, für Cron-Jobs

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@deinedomain.de

# Vercel Cron Security
CRON_SECRET=                   # Zufälliger langer String

# App
NEXT_PUBLIC_APP_URL=https://deinedomain.vercel.app
```

---

## 19. Edge Cases & Entscheidungen

| Szenario | Verhalten |
|----------|-----------|
| User öffnet App zweimal am selben Tag | words_seen_today wird nicht doppelt gezählt; API gibt dasselbe "aktuelle" Wort zurück wenn noch kein neues abgerufen |
| Streak bei 0 Wörtern an Tag 1 | Streak bleibt 0, keine Bestrafung |
| Alle 300 Wörter gesehen | Wörter aus nicht-gewählten Kategorien einblenden; Glückwunsch-Screen |
| User ändert Interessen: Kategorie entfernt | user_words der Kategorie bleiben; Algorithmus ignoriert sie für Neuauswahl |
| User ändert Interessen: Kategorie hinzugefügt | Neue Kategorie geht in Round-Robin-Pool; category_index reset |
| Netzwerkfehler bei Button-Klick | Optimistic Update + Rollback; Toast-Fehlermeldung |
| Email nicht zustellbar (Resend) | Fehler loggen, reminder_sent_today bleibt false (kein Retry-Loop) |
| Google OAuth User hat kein Passwort | Auth komplett über Supabase gemanaged, kein Passwort-Feld zeigen |

---

## 20. Nicht im MVP

- Share-Link / öffentliche Word-Pages
- Level nachträglich ändern (kein UI vorgesehen; nur über Supabase direkt möglich)
- Push Notifications (native mobile)
- User-definierte eigene Wörter
- Leaderboard / Social Features
- Streak-Freeze / Pause-Funktion

---

## 21. Implementierungs-Reihenfolge

1. **Projekt-Setup:** `pnpm create next-app`, shadcn/ui init, Supabase SDK, Fonts konfigurieren
2. **Supabase:** Tabellen anlegen, RLS-Policies, Trigger, .env.local befüllen
3. **`data/words.json`:** 300 kuratierte Wörter generieren
4. **Auth:** Login/Signup-Pages, Middleware, OAuth-Callback
5. **Onboarding:** Interessen-Auswahl, Level-Test, Sprach-Wahl
6. **Wort-Algorithmus:** `lib/word-selection.ts` + `/api/word/today`
7. **Word Card UI:** Vollständige Darstellung + Transitions
8. **Action Buttons + Spaced Repetition:** `/api/word/[wordId]/action`
9. **Streak-Logik:** `lib/streak.ts` + Milestone-Animationen
10. **Archiv:** `/archive` Page + Filter + Suche
11. **Settings:** `/settings` Page
12. **Email-Reminder:** Resend-Integration + Cron-Routes
13. **Dark Mode:** Tailwind `dark:` Klassen sauber durchziehen
14. **Typecheck + Lint + lokaler Test**
15. **README.md**

---

## 22. Akzeptanzkriterien (Definition of Done)

- [ ] `pnpm typecheck` ohne Fehler
- [ ] `pnpm lint` ohne Fehler  
- [ ] Signup → Onboarding (alle 3 Schritte) → erstes Wort → Button-Klick funktioniert
- [ ] "Noch eins?" zeigt zweites Wort; nach 5 Wörtern erscheint Tages-Limit-Screen
- [ ] Archiv zeigt alle gesehenen Wörter mit korrekten Filter-Tabs
- [ ] Streak erhöht sich korrekt, 7-Tage-Meilenstein zeigt Animation
- [ ] Dark Mode sieht auf iOS Safari sauber aus
- [ ] Cron-Route gibt 401 zurück ohne `CRON_SECRET`
