/**
 * WhatsApp through Twilio's Messaging API (plain REST, no SDK). Business-started messages such as
 * booking confirmations must use a Meta-approved template (Content SID "HX…" + variables); free text
 * only works within 24 hours of the person messaging us, so it isn't offered here.
 *
 * Env (Netlify): TWILIO_ACCOUNT_SID, and TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET (preferred) or
 * TWILIO_AUTH_TOKEN; TWILIO_WHATSAPP_FROM (the WhatsApp sender, "+14155238886" in the sandbox);
 * TWILIO_WA_GUEST_BOOKING_SID / TWILIO_WA_HOTEL_BOOKING_SID (the two templates in
 * docs/WHATSAPP_TEMPLATES.md). Until they're set, sends are skipped and logged, never thrown.
 */
import { logger } from '@/lib/utils/logger'

export type WhatsAppTemplate = 'guestBooking' | 'hotelBooking'

export type WhatsAppResult =
  | { status: 'sent'; sid: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string; code?: number }

function config() {
  const env = process.env
  return {
    accountSid: env.TWILIO_ACCOUNT_SID,
    // API keys can be revoked one by one; the auth token is the account's master key
    username: env.TWILIO_API_KEY_SID || env.TWILIO_ACCOUNT_SID,
    password: env.TWILIO_API_KEY_SID ? env.TWILIO_API_KEY_SECRET : env.TWILIO_AUTH_TOKEN,
    from: env.TWILIO_WHATSAPP_FROM?.replace(/^whatsapp:/, ''),
    templates: {
      guestBooking: env.TWILIO_WA_GUEST_BOOKING_SID,
      hotelBooking: env.TWILIO_WA_HOTEL_BOOKING_SID,
    } satisfies Record<WhatsAppTemplate, string | undefined>,
  }
}

/** Sends a template message to an E.164 number ("+919876543210"). Never throws. */
export async function sendWhatsAppTemplate(
  template: WhatsAppTemplate,
  to: string,
  variables: Record<string, string>
): Promise<WhatsAppResult> {
  const cfg = config()
  const contentSid = cfg.templates[template]
  if (!cfg.accountSid || !cfg.username || !cfg.password || !cfg.from || !contentSid) {
    return { status: 'skipped', reason: 'WhatsApp is not configured' }
  }
  if (!/^\+[1-9]\d{7,14}$/.test(to)) return { status: 'skipped', reason: 'Not a valid mobile number' }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: `whatsapp:${cfg.from}`,
        To: `whatsapp:${to}`,
        ContentSid: contentSid,
        ContentVariables: JSON.stringify(variables),
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      logger.error('whatsapp', `Twilio rejected the ${template} message`, undefined, { code: json.code, message: json.message })
      return { status: 'failed', error: json.message || `HTTP ${res.status}`, code: json.code }
    }
    return { status: 'sent', sid: json.sid }
  } catch (error: any) {
    logger.error('whatsapp', `Sending the ${template} message failed`, error)
    return { status: 'failed', error: error?.message || 'Network error' }
  }
}
