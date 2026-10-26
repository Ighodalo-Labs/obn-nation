/**
 * Which app sends the sign-in codes and rejection links (CR-01, doc 11).
 * One setting, NEXT_PUBLIC_MESSAGE_CHANNEL, so screens and server always agree. Default is whatsapp.
 * Next.js inlines the value at build time, so a change needs a redeploy.
 */
export type Channel = 'whatsapp' | 'telegram';
export const CHANNEL: Channel = process.env.NEXT_PUBLIC_MESSAGE_CHANNEL === 'telegram' ? 'telegram' : 'whatsapp';
export const CHANNEL_NAME = CHANNEL === 'telegram' ? 'Telegram' : 'WhatsApp';
