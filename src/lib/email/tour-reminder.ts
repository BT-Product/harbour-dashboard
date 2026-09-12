/**
 * The day-before tour reminder.
 *
 * Written to be read on a phone the evening before, standing in a kitchen.
 * The addresses and times are the payload — everything else is framing, and
 * the list is what gets skimmed, so it stays near the top.
 */

export type ReminderStop = {
  address: string;
  scheduledAt: string;
  notes: string | null;
};

export type ReminderInput = {
  clientName: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string | null;
  tourDateLabel: string;
  stops: ReminderStop[];
  dashboardUrl: string;
  timeZone: string;
};

function formatTime(iso: string, timeZone: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function reminderSubject(input: ReminderInput) {
  const count = input.stops.length;
  return `Tomorrow's tour — ${count} home${count === 1 ? "" : "s"}, starting ${formatTime(
    input.stops[0].scheduledAt,
    input.timeZone,
  )}`;
}

export function reminderText(input: ReminderInput) {
  const lines = [
    `Hi ${input.clientName.split(" ")[0]},`,
    "",
    `Quick reminder about tomorrow — ${input.tourDateLabel}. Here's the plan:`,
    "",
    ...input.stops.flatMap((stop) => {
      const line = `${formatTime(stop.scheduledAt, input.timeZone)} — ${stop.address}`;
      return stop.notes ? [line, `   ${stop.notes}`] : [line];
    }),
    "",
    "Wear something you can walk in, and bring any questions that have come up.",
    "",
    `Your dashboard has the full list and your notes from homes you've already seen: ${input.dashboardUrl}`,
    "",
    "If anything's changed on your end, just reply to this email or call me.",
    "",
    input.agentName,
    input.agentPhone ?? "",
    input.agentEmail,
  ];

  return lines.filter((line, i) => !(line === "" && lines[i - 1] === "")).join("\n");
}

export function reminderHtml(input: ReminderInput) {
  const stops = input.stops
    .map((stop) => {
      const notes = stop.notes
        ? `<div style="color:#6b6b6b;font-size:14px;margin-top:2px;">${escapeHtml(stop.notes)}</div>`
        : "";
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eceae5;">
            <div style="font-size:15px;color:#1c1c1c;">
              <strong>${escapeHtml(formatTime(stop.scheduledAt, input.timeZone))}</strong>
              &nbsp;&nbsp;${escapeHtml(stop.address)}
            </div>
            ${notes}
          </td>
        </tr>`;
    })
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1c1c;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eceae5;border-radius:12px;padding:28px;">
      <p style="margin:0 0 16px;font-size:16px;">Hi ${escapeHtml(input.clientName.split(" ")[0])},</p>

      <p style="margin:0 0 20px;font-size:16px;line-height:1.5;">
        Quick reminder about tomorrow — ${escapeHtml(input.tourDateLabel)}. Here's the plan:
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${stops}</table>

      <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#4a4a4a;">
        Wear something you can walk in, and bring any questions that have come up.
      </p>

      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#4a4a4a;">
        Your dashboard has the full list and your notes from homes you've already seen:
        <a href="${input.dashboardUrl}" style="color:#1f4e46;">open your dashboard</a>.
      </p>

      <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#4a4a4a;">
        If anything's changed on your end, just reply to this email or call me.
      </p>

      <p style="margin:0;font-size:15px;line-height:1.6;">
        ${escapeHtml(input.agentName)}<br />
        ${input.agentPhone ? `${escapeHtml(input.agentPhone)}<br />` : ""}
        <a href="mailto:${escapeHtml(input.agentEmail)}" style="color:#1f4e46;">${escapeHtml(
          input.agentEmail,
        )}</a>
      </p>
    </div>
  </body>
</html>`;
}
