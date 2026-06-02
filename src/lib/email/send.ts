import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

const FROM = process.env.EMAIL_FROM ?? "MarviDesk <support@example.com>";
const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? "inbound.example.com";

/** Reply-to address embedding a per-ticket token, so inbound replies route back. */
export function replyToForTicket(ticketId: string) {
  return `reply+${ticketId}@${INBOUND_DOMAIN}`;
}

export async function sendTicketEmail(opts: {
  to: string;
  subject: string;
  text: string;
  ticketId: string;
  ticketNumber: number;
  messageId?: string;
  inReplyTo?: string;
}) {
  const messageId =
    opts.messageId ?? `<${opts.ticketId}.${Date.now()}@${INBOUND_DOMAIN}>`;
  await transporter.sendMail({
    from: FROM,
    to: opts.to,
    subject: `[#${opts.ticketNumber}] ${opts.subject}`,
    text: opts.text,
    replyTo: replyToForTicket(opts.ticketId),
    messageId,
    // Threading: reference the ticket's canonical message id.
    references: opts.inReplyTo,
    inReplyTo: opts.inReplyTo,
  });
  return messageId;
}
