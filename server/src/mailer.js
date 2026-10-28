const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);


const ACCENT = "#19e6a2";
const INK = "#07100d";

const receivedAt = () =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date()) + " IST";

function row(label, valueHtml) {
  return (
    `<tr><td style="padding:14px 0;border-bottom:1px solid #e6efec;width:120px;vertical-align:top;font:600 11px/1.4 'Courier New',monospace;letter-spacing:1.4px;text-transform:uppercase;color:#6b7d77">${label}</td>` +
    `<td style="padding:14px 0;border-bottom:1px solid #e6efec;vertical-align:top;font:500 15px/1.5 Arial,Helvetica,sans-serif;color:${INK}">${valueHtml}</td></tr>`
  );
}

function inquiryHtml(inquiry, serviceLabel) {
  const name = escapeHtml(inquiry.name);
  const email = escapeHtml(inquiry.email);
  const phone = escapeHtml(inquiry.phone);
  const phoneHref = escapeHtml(String(inquiry.phone).replace(/[^\d+]/g, ""));
  const service = escapeHtml(serviceLabel);
  const message = escapeHtml(inquiry.message).replace(/\r?\n/g, "<br>");
  const initial = escapeHtml(String(inquiry.name).trim().charAt(0).toUpperCase() || "?");
  const replySubject = encodeURIComponent(`Re: ${serviceLabel}`);

  return (
    `<!doctype html><html><body style="margin:0;padding:0;background:#eef5f3">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${name} sent a new inquiry about ${service}.</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef5f3;padding:32px 12px"><tr><td align="center">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(7,16,13,0.10)">` +
    // Header
    `<tr><td style="background:${INK};padding:28px 32px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
    `<td style="font:800 22px/1 Arial,Helvetica,sans-serif;color:${ACCENT};letter-spacing:-0.5px">VJ<span style="color:#ffffff">.</span></td>` +
    `<td align="right" style="font:500 11px/1 'Courier New',monospace;letter-spacing:1.6px;text-transform:uppercase;color:#7f948d">New inquiry</td>` +
    `</tr></table>` +
    `<h1 style="margin:22px 0 6px;font:800 26px/1.2 Arial,Helvetica,sans-serif;color:#ffffff;letter-spacing:-0.5px">Someone wants to work with you.</h1>` +
    `<p style="margin:0;font:400 14px/1.5 Arial,Helvetica,sans-serif;color:#9fb3ac">Received ${receivedAt()} from your portfolio contact form.</p>` +
    `</td></tr>` +
    `<tr><td style="height:4px;background:${ACCENT};font-size:0;line-height:0">&nbsp;</td></tr>` +
    // Sender card
    `<tr><td style="padding:28px 32px 8px">` +
    `<table role="presentation" cellpadding="0" cellspacing="0"><tr>` +
    `<td width="52" style="width:52px;min-width:52px"><div style="width:52px;height:52px;border-radius:26px;background:${ACCENT};text-align:center;font:800 22px/52px Arial,Helvetica,sans-serif;color:${INK}">${initial}</div></td>` +
    `<td style="padding-left:16px"><div style="font:700 18px/1.3 Arial,Helvetica,sans-serif;color:${INK}">${name}</div>` +
    `<div style="margin-top:4px"><span style="display:inline-block;padding:4px 12px;border-radius:999px;background:#e3faf1;font:600 12px/1.4 Arial,Helvetica,sans-serif;color:#0b7a57">${service}</span></div></td>` +
    `</tr></table></td></tr>` +
    // Details
    `<tr><td style="padding:8px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">` +
    row("Email", `<a href="mailto:${email}" style="color:#0b7a57;text-decoration:none">${email}</a>`) +
    row("Phone", `<a href="tel:${phoneHref}" style="color:#0b7a57;text-decoration:none">${phone}</a>`) +
    row("Service", service) +
    `</table></td></tr>` +
    // Message
    `<tr><td style="padding:24px 32px 8px">` +
    `<div style="font:600 11px/1.4 'Courier New',monospace;letter-spacing:1.4px;text-transform:uppercase;color:#6b7d77;margin-bottom:10px">Message</div>` +
    `<div style="padding:18px 20px;border-radius:14px;background:#f4f9f7;border-left:4px solid ${ACCENT};font:400 15px/1.7 Arial,Helvetica,sans-serif;color:${INK}">${message}</div>` +
    `</td></tr>` +
    // Actions
    `<tr><td style="padding:24px 32px 32px">` +
    `<table role="presentation" cellpadding="0" cellspacing="0"><tr>` +
    `<td style="border-radius:999px;background:${INK}"><a href="mailto:${email}?subject=${replySubject}" style="display:inline-block;padding:13px 26px;font:700 14px/1 Arial,Helvetica,sans-serif;color:${ACCENT};text-decoration:none">Reply to ${name}</a></td>` +
    `<td style="width:12px">&nbsp;</td>` +
    `<td style="border-radius:999px;border:1px solid #cfe0db"><a href="tel:${phoneHref}" style="display:inline-block;padding:12px 24px;font:600 14px/1 Arial,Helvetica,sans-serif;color:${INK};text-decoration:none">Call</a></td>` +
    `</tr></table></td></tr>` +
    // Footer
    `<tr><td style="padding:18px 32px;background:#f4f9f7;border-top:1px solid #e6efec;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#6b7d77">` +
    `Sent from the Vishal Jadhav portfolio inquiry form. Hit reply and your answer goes straight to ${name}.` +
    `</td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

// ---------- Emails to the person who sent the inquiry ----------

const OWNER_PHONE = "+91 95274 73987";
const firstName = (name) => String(name).trim().split(/\s+/)[0] || "there";

/** Shared frame for the emails a visitor receives. */
function visitorShell({ preheader, eyebrow, title, subtitle, body, footer }) {
  return (
    `<!doctype html><html><body style="margin:0;padding:0;background:#eef5f3">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef5f3;padding:32px 12px"><tr><td align="center">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(7,16,13,0.10)">` +
    `<tr><td style="background:${INK};padding:28px 32px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
    `<td style="font:800 22px/1 Arial,Helvetica,sans-serif;color:${ACCENT};letter-spacing:-0.5px">VJ<span style="color:#ffffff">.</span></td>` +
    `<td align="right" style="font:500 11px/1 'Courier New',monospace;letter-spacing:1.6px;text-transform:uppercase;color:#7f948d">${eyebrow}</td>` +
    `</tr></table>` +
    `<h1 style="margin:22px 0 8px;font:800 26px/1.2 Arial,Helvetica,sans-serif;color:#ffffff;letter-spacing:-0.5px">${title}</h1>` +
    `<p style="margin:0;font:400 15px/1.6 Arial,Helvetica,sans-serif;color:#9fb3ac">${subtitle}</p>` +
    `</td></tr>` +
    `<tr><td style="height:4px;background:${ACCENT};font-size:0;line-height:0">&nbsp;</td></tr>` +
    body +
    `<tr><td style="padding:18px 32px;background:#f4f9f7;border-top:1px solid #e6efec;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#6b7d77">${footer}</td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

function summaryCard(service, message) {
  return (
    `<tr><td style="padding:28px 32px 4px"><div style="font:600 11px/1.4 'Courier New',monospace;letter-spacing:1.4px;text-transform:uppercase;color:#6b7d77;margin-bottom:10px">Your inquiry</div>` +
    `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:#e3faf1;font:600 12px/1.4 Arial,Helvetica,sans-serif;color:#0b7a57">${service}</span>` +
    `<div style="margin-top:12px;padding:18px 20px;border-radius:14px;background:#f4f9f7;border-left:4px solid ${ACCENT};font:400 15px/1.7 Arial,Helvetica,sans-serif;color:${INK}">${message}</div></td></tr>`
  );
}

function step(number, text) {
  return (
    `<tr><td style="padding:8px 0;vertical-align:top;width:40px"><div style="width:28px;height:28px;border-radius:14px;background:${INK};text-align:center;font:700 13px/28px Arial,Helvetica,sans-serif;color:${ACCENT}">${number}</div></td>` +
    `<td style="padding:8px 0;vertical-align:top;font:400 15px/1.6 Arial,Helvetica,sans-serif;color:${INK}">${text}</td></tr>`
  );
}

function buttons(ownerEmail) {
  const phoneHref = OWNER_PHONE.replace(/[^\d+]/g, "");
  return (
    `<tr><td style="padding:24px 32px 32px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>` +
    `<td style="border-radius:999px;background:${INK}"><a href="mailto:${escapeHtml(ownerEmail)}" style="display:inline-block;padding:13px 26px;font:700 14px/1 Arial,Helvetica,sans-serif;color:${ACCENT};text-decoration:none">Email me</a></td>` +
    `<td style="width:12px">&nbsp;</td>` +
    `<td style="border-radius:999px;border:1px solid #cfe0db"><a href="tel:${phoneHref}" style="display:inline-block;padding:12px 24px;font:600 14px/1 Arial,Helvetica,sans-serif;color:${INK};text-decoration:none">${OWNER_PHONE}</a></td>` +
    `</tr></table></td></tr>`
  );
}

function receiptHtml(inquiry, serviceLabel, reference, ownerEmail) {
  const name = escapeHtml(firstName(inquiry.name));
  const body =
    summaryCard(escapeHtml(serviceLabel), escapeHtml(inquiry.message).replace(/\r?\n/g, "<br>")) +
    `<tr><td style="padding:24px 32px 0"><div style="font:600 11px/1.4 'Courier New',monospace;letter-spacing:1.4px;text-transform:uppercase;color:#6b7d77;margin-bottom:8px">What happens next</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">` +
    step(1, "I read your inquiry and check how I can help.") +
    step(2, `I reply by email or call you on <b>${escapeHtml(inquiry.phone)}</b>.`) +
    step(3, "We agree the scope, then I start building.") +
    `</table></td></tr>` +
    buttons(ownerEmail);
  return visitorShell({
    preheader: `Thanks ${name}, your inquiry about ${escapeHtml(serviceLabel)} has been received.`,
    eyebrow: reference ? `Ref #${escapeHtml(reference)}` : "Inquiry received",
    title: `Thanks, ${name}. Your inquiry is in.`,
    subtitle: "I have received your message and will get back to you personally.",
    body,
    footer: "You are getting this because this email address was used on the Vishal Jadhav portfolio contact form. If that was not you, you can ignore this message.",
  });
}

function acceptedHtml(inquiry, serviceLabel, ownerEmail) {
  const name = escapeHtml(firstName(inquiry.name));
  const body =
    summaryCard(escapeHtml(serviceLabel), escapeHtml(inquiry.message).replace(/\r?\n/g, "<br>")) +
    `<tr><td style="padding:24px 32px 0"><div style="padding:18px 20px;border-radius:14px;background:#e3faf1;font:400 15px/1.7 Arial,Helvetica,sans-serif;color:${INK}">` +
    `<b>What happens now:</b> I will contact you shortly by <b>phone call</b> on ${escapeHtml(inquiry.phone)} or by <b>email</b> at ${escapeHtml(inquiry.email)}. Please keep your phone nearby.` +
    `</div></td></tr>` +
    buttons(ownerEmail);
  return visitorShell({
    preheader: `Good news ${name}, your inquiry about ${escapeHtml(serviceLabel)} is accepted.`,
    eyebrow: "Inquiry accepted",
    title: `Good news, ${name}. Your inquiry is accepted.`,
    subtitle: "I would like to work with you. I will call or email you very soon.",
    body,
    footer: "You are getting this because you sent an inquiry through the Vishal Jadhav portfolio. Reply to this email any time and it reaches me directly.",
  });
}

/**
 * `transport` needs one method: sendMail(options). In production it is a nodemailer transport.
 * Returns "sent", or "skipped" when no SMTP password is configured.
 */
export function createMailer({ transport, mail }) {
  return {
    configured: Boolean(transport),

    async sendInquiry(inquiry, serviceLabel) {
      if (!transport) return "skipped";

      const lines = [
        `Name: ${inquiry.name}`,
        `Email: ${inquiry.email}`,
        `Phone: ${inquiry.phone}`,
        `Inquiry for: ${serviceLabel}`,
        "",
        inquiry.message,
      ];

      await transport.sendMail({
        from: `"Portfolio inquiries" <${mail.user}>`,
        to: mail.to,
        replyTo: `"${inquiry.name.replace(/"/g, "")}" <${inquiry.email}>`,
        subject: `New inquiry: ${serviceLabel} (${inquiry.name})`,
        text: lines.join("\n"),
        html: inquiryHtml(inquiry, serviceLabel),
      });
      return "sent";
    },

    /** Confirmation to the visitor that the inquiry arrived. Returns "sent" or "skipped". */
    async sendReceipt(inquiry, serviceLabel, reference = "") {
      if (!transport) return "skipped";
      await transport.sendMail({
        from: `"Vishal Jadhav" <${mail.user}>`,
        to: inquiry.email,
        replyTo: mail.to,
        subject: `We received your inquiry: ${serviceLabel}`,
        text: [
          `Hi ${firstName(inquiry.name)},`,
          "",
          `Thanks for your inquiry about ${serviceLabel}. I have received it and will reply by email or call you on ${inquiry.phone}.`,
          "",
          "Your message:",
          inquiry.message,
          "",
          `Reply to this email or call ${OWNER_PHONE} any time.`,
          "",
          "Vishal Jadhav",
        ].join("\n"),
        html: receiptHtml(inquiry, serviceLabel, reference, mail.to),
      });
      return "sent";
    },

    /** Sent when the owner accepts an inquiry in the dashboard. Returns "sent" or "skipped". */
    async sendAccepted(inquiry, serviceLabel) {
      if (!transport) return "skipped";
      await transport.sendMail({
        from: `"Vishal Jadhav" <${mail.user}>`,
        to: inquiry.email,
        replyTo: mail.to,
        subject: `Your inquiry is accepted: ${serviceLabel}`,
        text: [
          `Hi ${firstName(inquiry.name)},`,
          "",
          `Good news. I have accepted your inquiry about ${serviceLabel}.`,
          `I will contact you shortly by phone call on ${inquiry.phone} or by email.`,
          "",
          `Reply to this email or call ${OWNER_PHONE} any time.`,
          "",
          "Vishal Jadhav",
        ].join("\n"),
        html: acceptedHtml(inquiry, serviceLabel, mail.to),
      });
      return "sent";
    },
  };
}

/** Builds the real SMTP transport. Returns null when SMTP_PASS is empty. */
export async function createSmtpTransport(mail) {
  if (!mail.pass) return null;
  const { default: nodemailer } = await import("nodemailer");
  return nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    secure: mail.port === 465,
    auth: { user: mail.user, pass: mail.pass },
  });
}