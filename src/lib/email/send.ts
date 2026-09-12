import { Resend } from "resend";

/**
 * Outbound client email. Separate from Supabase's auth mailer, which can
 * only send its own templates (invites, password resets) — anything Harbour
 * itself writes has to go out through here.
 */
export type SendResult = { ok: true; id: string } | { ok: false; error: string };

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(input: {
  to: string[];
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  if (!emailConfigured()) {
    return { ok: false, error: "RESEND_API_KEY or EMAIL_FROM is not set" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (error) return { ok: false, error: error.message };
    if (!data?.id) return { ok: false, error: "Resend returned no message id" };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed" };
  }
}
