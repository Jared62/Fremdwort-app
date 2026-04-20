-- ============================================================
-- Fremdwort App — Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── profiles ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  interests            TEXT[]      NOT NULL DEFAULT '{}',
  level                TEXT        NOT NULL DEFAULT 'beginner'
                         CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  language             TEXT        NOT NULL DEFAULT 'de'
                         CHECK (language IN ('de', 'en')),
  timezone             TEXT        NOT NULL DEFAULT 'Europe/Berlin',
  streak_count         INT         NOT NULL DEFAULT 0,
  longest_streak       INT         NOT NULL DEFAULT 0,
  last_active_date     DATE,
  words_seen_today     INT         NOT NULL DEFAULT 0,
  last_word_date       DATE,
  category_index       INT         NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN     NOT NULL DEFAULT FALSE,
  email_reminders      BOOLEAN     NOT NULL DEFAULT TRUE,
  reminder_sent_today  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── user_words ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_words (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id          TEXT        NOT NULL,
  status           TEXT        NOT NULL
                     CHECK (status IN ('known', 'learning_easy', 'learning_hard')),
  next_review_date DATE,
  seen_count       INT         NOT NULL DEFAULT 1,
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, word_id)
);

ALTER TABLE public.user_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own word progress"
  ON public.user_words FOR ALL
  USING (auth.uid() = user_id);

-- Performance index for due reviews
CREATE INDEX IF NOT EXISTS idx_user_words_user_review
  ON public.user_words(user_id, next_review_date)
  WHERE status != 'known';
