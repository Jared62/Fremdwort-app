import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getCurrentHourInTz, getTodayInTz } from "@/lib/timezone";

const REMINDER_HOUR = 18;

export async function POST(request: Request) {
  // Verify cron secret
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role key via direct Supabase REST to query all users
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Find users where reminder hour matches their local time
  // and they haven't learned a word today
  // and email_reminders is true
  // and reminder_sent_today is false
  const profilesRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?email_reminders=eq.true&reminder_sent_today=eq.false&select=id,timezone,last_word_date`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );

  if (!profilesRes.ok) {
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }

  const profiles: { id: string; timezone: string; last_word_date: string | null }[] =
    await profilesRes.json();

  const toRemind = profiles.filter((p) => {
    const hour = getCurrentHourInTz(p.timezone);
    const today = getTodayInTz(p.timezone);
    return hour === REMINDER_HOUR && p.last_word_date !== today;
  });

  if (toRemind.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Get email addresses from auth.users via admin API
  let sent = 0;
  for (const profile of toRemind) {
    try {
      const userRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${profile.id}`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );
      const userData = await userRes.json();
      const email = userData?.email;
      if (!email) continue;

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@fremdwort.app",
        to: email,
        subject: "Dein Wort des Tages wartet auf dich",
        html: reminderEmailHtml(),
      });

      // Mark as sent
      await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${profile.id}`,
        {
          method: "PATCH",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ reminder_sent_today: true }),
        }
      );
      sent++;
    } catch {
      // continue on individual failure
    }
  }

  return NextResponse.json({ sent });
}

function reminderEmailHtml(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fremdwort.app";
  return `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF7F0;font-family:Georgia,serif;">
  <div style="max-width:480px;margin:40px auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E8E0D0;">
    <div style="padding:40px 36px 32px;">
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:600;letter-spacing:0.02em;color:#1C1917;">
        Fremdwort
      </h1>
      <p style="margin:0 0 24px;font-size:13px;color:#78716C;letter-spacing:0.1em;text-transform:uppercase;">
        Deine tägliche Erinnerung
      </p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#1C1917;">
        Du hast heute noch kein Wort gelernt. Es dauert weniger als eine Minute — und dein Streak wartet.
      </p>
      <a href="${appUrl}"
         style="display:inline-block;margin-top:8px;padding:12px 28px;background:#44332A;color:#FAF7F0;
                text-decoration:none;border-radius:8px;font-size:15px;font-weight:500;letter-spacing:0.01em;">
        Wort des Tages öffnen →
      </a>
    </div>
    <div style="padding:20px 36px;border-top:1px solid #E8E0D0;">
      <p style="margin:0;font-size:12px;color:#A8A29E;line-height:1.6;">
        Du erhältst diese Mail, weil du E-Mail-Erinnerungen aktiviert hast.<br>
        <a href="${appUrl}/settings" style="color:#A8A29E;">Einstellungen ändern</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
