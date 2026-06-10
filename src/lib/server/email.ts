import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

// Only construct a client when configured, so local dev works without a key.
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const from = env.EMAIL_FROM ?? 'Dominatus <onboarding@resend.dev>';

type Email = { to: string; subject: string; html: string };

export async function sendEmail({ to, subject, html }: Email): Promise<void> {
	// No key (local/dev): log the message so verification/reset links are still usable.
	if (!resend) {
		console.warn(
			`[email] RESEND_API_KEY not set — not sending. to=${to} subject="${subject}"\n${html}`
		);
		return;
	}

	const { error } = await resend.emails.send({ from, to, subject, html });
	if (error) throw new Error(`Failed to send "${subject}" to ${to}: ${error.message}`);
}
