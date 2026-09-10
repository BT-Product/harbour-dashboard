import { headers } from "next/headers";

/**
 * The public origin to send people back to from an auth email.
 *
 * Supabase falls back to the project's Site URL when a link carries no
 * explicit redirect, and that default is http://localhost:3000 — which is
 * how the first real client's invite link dead-ended on her machine. Every
 * link this app generates now names its own origin instead of relying on
 * that setting.
 *
 * Derived from the request by default so preview deployments send people
 * back to the preview, not to production. NEXT_PUBLIC_SITE_URL overrides.
 */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
