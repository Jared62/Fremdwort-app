import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, streak_count")
    .eq("id", user.id)
    .single();

  // Read current pathname from middleware header to avoid redirect loop
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isOnboarding = pathname.startsWith("/onboarding");

  if (profile && !profile.onboarding_completed && !isOnboarding) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link href="/" className="font-display text-lg font-semibold tracking-wide">
            Fremdwort
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/archive"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Archiv
            </Link>
            <Link
              href="/settings"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Einstellungen
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-8">
        {children}
      </main>
    </div>
  );
}
