# 11 · CR-01 Telegram as the message channel (Phase 1)

Date: 26 Oct 2026 · Status: in build · Owner: Ighodalo Labs (Desmond) · Requested by: OBN NATION

## 1. What changes and why

The client asked to start with Telegram and add WhatsApp later. Sign-in codes and rejection links now go through a Telegram bot. WhatsApp code stays in the repo and is switched by one setting.

| | Before | After (this CR) |
|---|---|---|
| Sign-in code | WhatsApp template through Twilio | Telegram bot message |
| Rejection notice and edit link | WhatsApp template through Twilio | Telegram bot message |
| Needs Meta approval | Yes | No |
| Cost per message | Meta and Twilio fees | None (normal bot) |
| Seller needs | WhatsApp | Telegram, linked once to their phone number |

Switch: `NEXT_PUBLIC_MESSAGE_CHANNEL=telegram` or `whatsapp`. Default stays `whatsapp`, so nothing changes until we flip it.

## 2. The one new idea: linking

A bot cannot message a person first. So each phone number is linked to a Telegram chat once.

1. Seller enters the phone number on `/list`.
2. If the number is not linked, the site shows "Open Telegram" (a link with a one-time code).
3. Seller presses Start in the bot, then taps "Share my number".
4. The bot checks two things: the shared contact belongs to the same Telegram account that sent it, and the number equals the one typed on the site.
5. The site sees the link and sends the sign-in code to that chat. Later sign-ins skip steps 2 to 4.

## 3. Database changes (migration `0006_telegram_link.sql`)

Both tables have RLS on and no policies. Only the service role reaches them, like `otp_attempts`.

`telegram_links`: one row per linked number.

| Column | Type | Notes |
|---|---|---|
| phone | text PK | E.164, same check as profiles |
| chat_id | bigint not null | Where the bot sends messages |
| telegram_user_id | bigint unique not null | Proves whose account it is |
| username | text null | Optional, for support |
| linked_at | timestamptz | default now() |

`telegram_link_requests`: a pending link, valid 15 minutes.

| Column | Type | Notes |
|---|---|---|
| nonce | text PK | 32 hex chars, goes in the Start link |
| phone | text not null | The number typed on the site |
| tg_chat_id, tg_user_id | bigint null | Filled when the person presses Start |
| created_at, expires_at | timestamptz | 15 minutes |
| used_at | timestamptz null | Set when linking completes |

Functions (service role only): `telegram_request_link(phone)`, `telegram_attach_start(nonce, chat, user)`, `telegram_complete_link(chat, user, phone, username)`, `telegram_link_done(nonce)`, `telegram_chat_for(phone)`.

ERD change: `PROFILES ||..o| TELEGRAM_LINKS : "same phone"` (soft link by phone, no foreign key, because the link can exist before the profile does) and `TELEGRAM_LINK_REQUESTS` stands alone. Documented in doc 03 section 2.

## 4. App changes

| Area | File | Change |
|---|---|---|
| Settings | `lib/env.ts` | `NEXT_PUBLIC_MESSAGE_CHANNEL`, `TELEGRAM_MODE`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_BOT_USERNAME`. Twilio keys are needed only when the channel is WhatsApp |
| Sender | `lib/telegram.ts` (new) | Bot API call, message texts |
| Webhook logic | `lib/telegram-webhook.ts` (new) | `/start`, contact check, link save |
| Database calls | `lib/telegram-deps.ts` (new) | RPC wrappers |
| Route | `app/api/telegram/webhook` (new) | Secret header check, always answers 200 |
| Route | `app/api/auth/telegram/status` (new) | Browser polls "is it linked yet" |
| Sign-in | `lib/auth/otp.ts`, `deps.ts` | `sendCode` returns `needs_telegram_link` with the deep link when not linked |
| Senders | `otp-sender.ts`, `rejection-sender.ts` | Pick the channel |
| UI | `SignInFlow.tsx`, `list/page.tsx` | "Open Telegram" step, copy follows the channel |
| Docs | docs 02, 03, 07, diagram 2, `PROGRESS.md`, `.env.example` | Updated in this CR |

## 5. Tests

- Unit tests with fakes: sender, webhook rules (own-number check, wrong number, expired, replay), `sendCode` link gate, env rules, status route.
- SQL tests `supabase/tests/telegram_link_test.sql`: request reuse, expiry, single use, number mismatch, relink, privileges.
- All existing tests must still pass.

## 6. What the humans must do

| Who | Step |
|---|---|
| Desmond | Create the bot in @BotFather (`/newbot`), keep the token private |
| Desmond | Vercel env: `NEXT_PUBLIC_MESSAGE_CHANNEL=telegram`, `TELEGRAM_MODE=live`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` (random 32+ chars) |
| Desmond | Supabase: run `0006_telegram_link.sql` |
| Desmond | Run the one-time `setWebhook` command (in `PROGRESS.md`) after the deploy |
| Desmond | Remove his number from the Supabase test-OTP list so a real code is sent |
| Both | Real phone test: link, sign in, list, reject, receive the link |
| Client | Written yes to Telegram first. Bot owner now is Desmond's account; hand over later |

## 7. Limits to tell the client

- Sellers need Telegram. In Nigeria it is far less common than WhatsApp.
- A seller who blocks the bot will not get codes or rejection links.
- WhatsApp stays on the roadmap. The switch is a setting, not a rebuild.
