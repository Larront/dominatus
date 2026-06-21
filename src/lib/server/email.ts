import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { log } from './log';

// Only construct a client when configured, so local dev works without a key.
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const from = env.EMAIL_FROM ?? 'Dominatus <onboarding@resend.dev>';

type Email = { to: string; subject: string; html: string };

export async function sendEmail({ to, subject, html }: Email): Promise<void> {
	// No key (local/dev): log the message so verification/reset links are still usable.
	if (!resend) {
		log.warn({ to, subject, html }, 'RESEND_API_KEY not set — email not sent');
		return;
	}

	const { error } = await resend.emails.send({ from, to, subject, html });
	if (error) throw new Error(`Failed to send "${subject}" to ${to}: ${error.message}`);
}

/**
 * Wraps transactional copy in the Campaign Cogitator shell — a dark card, a phosphor accent rule,
 * the wordmark, a "// kicker", and a hard-cornered CTA. Table layout + inline styles only, so it
 * survives Gmail/Outlook; the action URL is also printed as plain text in case a client strips the
 * button. `body`/`footnote` are our own static strings (never user input), so interpolation is safe.
 */
export function brandedEmail(opts: {
	kicker: string;
	heading: string;
	body: string;
	ctaLabel: string;
	ctaUrl: string;
	footnote?: string;
}): string {
	const { kicker, heading, body, ctaLabel, ctaUrl, footnote } = opts;
	return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#070b09;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070b09;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#0e1411;border:1px solid #1f2a24;">
        <tr><td style="height:3px;background:linear-gradient(90deg,#54e0a0,rgba(84,224,160,0));font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:30px 32px 34px;font-family:Arial,Helvetica,sans-serif;">
          <div style="font-size:15px;font-weight:bold;letter-spacing:4px;color:#e8efe9;text-transform:uppercase;">DOMINATUS</div>
          <div style="margin-top:24px;font-size:11px;font-weight:bold;letter-spacing:2.5px;color:#54e0a0;text-transform:uppercase;">${kicker}</div>
          <h1 style="margin:10px 0 0;font-size:22px;line-height:1.2;font-weight:bold;color:#e8efe9;">${heading}</h1>
          <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#9fb0a7;">${body}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 0;"><tr>
            <td style="background:#54e0a0;">
              <a href="${ctaUrl}" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#06120c;text-decoration:none;">${ctaLabel}</a>
            </td>
          </tr></table>
          <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#6b7d74;">Or paste this link into your browser:<br><a href="${ctaUrl}" style="color:#54e0a0;word-break:break-all;">${ctaUrl}</a></p>
          ${footnote ? `<p style="margin:22px 0 0;padding-top:18px;border-top:1px solid #1f2a24;font-size:12px;line-height:1.5;color:#6b7d74;">${footnote}</p>` : ''}
        </td></tr>
      </table>
      <div style="margin-top:16px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;color:#4a574f;text-transform:uppercase;">Campaign Cogitator &middot; One war at a time</div>
    </td></tr>
  </table>
</body>
</html>`;
}
