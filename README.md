# Fremdwort — Täglich ein Wort

Eine tägliche Lern-App für kuratierte Fremdwörter aus Geopolitik, Philosophie, Wirtschaft und mehr.

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui · Cinzel-Font · Cream-Design
- **Supabase** (Auth + Datenbank)
- **Resend** (E-Mail-Erinnerungen)
- **Vercel** (Deployment + Cron Jobs)

---

## Setup

### 1. Abhängigkeiten installieren

```bash
pnpm install
```

### 2. Supabase-Projekt erstellen

1. Gehe zu [supabase.com](https://supabase.com) und erstelle ein neues Projekt
2. **SQL Editor** → Inhalt von `supabase/migrations/001_initial.sql` einfügen → **Run**
3. Kopiere unter **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Service Role — geheim halten!)

### 3. Environment Variables

```bash
cp .env.local.example .env.local
# Werte ausfüllen
```

### 4. Lokal starten

```bash
pnpm dev
# → http://localhost:3000
```

**Erster Start:** `/signup` → Bestätigungsmail klicken → Onboarding → Erstes Wort lernen.

---

## Vercel Deployment

### 1. Projekt deployen

```bash
npm i -g vercel
vercel
```

Oder Repository direkt auf [vercel.com/new](https://vercel.com/new) importieren.

### 2. Environment Variables in Vercel

Alle Werte aus `.env.local` im Vercel Dashboard eintragen. `NEXT_PUBLIC_APP_URL` auf die echte Domain setzen.

### 3. Supabase Redirect URLs

In Supabase → **Authentication → URL Configuration**:
- Site URL: `https://deine-app.vercel.app`
- Redirect URL: `https://deine-app.vercel.app/auth/callback`

### 4. Google OAuth (optional)

1. Google Cloud Console → OAuth 2.0 Client erstellen
2. Redirect URI: `https://xxxx.supabase.co/auth/v1/callback`
3. Client ID + Secret in Supabase → Authentication → Google eintragen

### 5. E-Mail-Erinnerungen (optional)

1. [resend.com](https://resend.com) → API-Key + Domain
2. `RESEND_API_KEY` und `RESEND_FROM_EMAIL` setzen
3. Cron-Jobs laufen automatisch via `vercel.json` (stündlich + täglich)

---

## Projektstruktur

```
app/
  (auth)/           Login, Signup
  (app)/            Hauptapp (Auth-geschützt)
    page.tsx        Tägliches Wort
    onboarding/     Einmaliges Onboarding (3 Schritte)
    archive/        Alle gesehenen Wörter mit Filter/Suche
    settings/       Interessen, Sprache, E-Mail-Reminder
  api/              REST-Routen + Cron-Endpoints
  auth/callback/    OAuth-Callback

components/         WordCard, StreakCounter
lib/                Supabase-Clients, Algorithmen
data/words.json     300 kuratierte Fremdwörter
supabase/           SQL-Migration
```

## Skripte

```bash
pnpm dev          # Dev-Server
pnpm build        # Produktions-Build
pnpm typecheck    # TypeScript prüfen
pnpm lint         # ESLint
```
