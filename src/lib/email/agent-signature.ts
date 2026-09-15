import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { formatLicense, hasLicense } from "@/lib/license";

type Admin = SupabaseClient<Database>;

/**
 * The agent a client email is sent on behalf of, and the one place every
 * client email's signature comes from.
 *
 * Found through the client's own profile (`profiles.agent_id`), never by
 * taking the first agents row: Harbour is multi-tenant, and the license
 * number printed on an email must be the sending agent's.
 */
export type SendingAgent = {
  name: string;
  email: string;
  phone: string | null;
  /** Null when not on file. Client emails are not sent without it. */
  dreNumber: string | null;
};

export async function getSendingAgent(admin: Admin, clientId: string): Promise<SendingAgent | null> {
  const { data: client } = await admin
    .from("profiles")
    .select("agent_id")
    .eq("id", clientId)
    .single();
  if (!client) return null;

  const [{ data: agent }, { data: agentProfile }] = await Promise.all([
    admin.from("agents").select("name, email, phone, dre_number").eq("id", client.agent_id).single(),
    admin
      .from("profiles")
      .select("full_name, phone")
      .eq("agent_id", client.agent_id)
      .eq("is_agent", true)
      .limit(1)
      .maybeSingle(),
  ]);
  if (!agent) return null;

  return {
    name: agentProfile?.full_name ?? agent.name,
    email: agent.email,
    phone: agent.phone ?? agentProfile?.phone ?? null,
    dreNumber: agent.dre_number,
  };
}

/** Why a client email can't be sent on this agent's behalf, or null if it can. */
export function missingLicenseReason(agent: SendingAgent | null): string | null {
  if (!agent) return "no agent on file for this client";
  if (!hasLicense(agent.dreNumber)) {
    return "no DRE license number on file — add it on your home page before emailing clients";
  }
  return null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function signatureText(agent: SendingAgent): string[] {
  return [
    agent.name,
    ...(agent.phone ? [agent.phone] : []),
    agent.email,
    ...(hasLicense(agent.dreNumber) ? [formatLicense(agent.dreNumber)] : []),
  ];
}

export function signatureHtml(agent: SendingAgent, linkColor = "#1f4e46"): string {
  return `
      <p style="margin:0;font-size:15px;line-height:1.6;">
        ${escapeHtml(agent.name)}<br />
        ${agent.phone ? `${escapeHtml(agent.phone)}<br />` : ""}
        <a href="mailto:${escapeHtml(agent.email)}" style="color:${linkColor};">${escapeHtml(agent.email)}</a>
        ${hasLicense(agent.dreNumber) ? `<br /><span style="color:#6b6b6b;font-size:13px;">${escapeHtml(formatLicense(agent.dreNumber))}</span>` : ""}
      </p>`;
}
