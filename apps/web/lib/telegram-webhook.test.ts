import { describe, expect, it, vi } from 'vitest';
import { handleUpdate, type LinkResult, type WebhookDeps } from './telegram-webhook';

const NONCE = 'a'.repeat(32);

function setup(over: Partial<WebhookDeps> = {}) {
  const replies: { chat: number; text: string; markup?: unknown }[] = [];
  const deps: WebhookDeps = {
    attachStart: vi.fn(async () => true),
    completeLink: vi.fn(async (): Promise<LinkResult> => 'linked'),
    reply: async (chat, text, markup) => void replies.push({ chat, text, markup }),
    ...over,
  };
  return { deps, replies };
}
const msg = (extra: object, from = { id: 200, username: 'ada' }, chat = { id: 100, type: 'private' }) => ({ message: { chat, from, ...extra } });

describe('/start with a one-time code', () => {
  it('remembers the chat and asks for the contact with a share button', async () => {
    const { deps, replies } = setup();
    await handleUpdate(deps, msg({ text: `/start ${NONCE}` }));
    expect(deps.attachStart).toHaveBeenCalledWith(NONCE, 100, 200);
    expect(JSON.stringify(replies[0].markup)).toContain('request_contact');
  });
  it('says the link expired when the code is unknown or old', async () => {
    const { deps, replies } = setup({ attachStart: async () => false });
    await handleUpdate(deps, msg({ text: `/start ${NONCE}` }));
    expect(replies[0].text).toMatch(/expired/);
  });
  it('greets a plain /start without touching the database', async () => {
    const { deps, replies } = setup();
    await handleUpdate(deps, msg({ text: '/start' }));
    expect(deps.attachStart).not.toHaveBeenCalled();
    expect(replies).toHaveLength(1);
  });
  it('ignores a malformed code', async () => {
    const { deps, replies } = setup();
    await handleUpdate(deps, msg({ text: '/start nope' }));
    expect(deps.attachStart).not.toHaveBeenCalled();
    expect(replies).toHaveLength(0);
  });
});

describe('shared contact', () => {
  it('links when the contact is the sender’s own and the database accepts it', async () => {
    const { deps, replies } = setup();
    await handleUpdate(deps, msg({ contact: { phone_number: '2348031234567', user_id: 200 } }));
    expect(deps.completeLink).toHaveBeenCalledWith(100, 200, '+2348031234567', 'ada');
    expect(replies[0].text).toMatch(/linked/);
  });
  it('refuses a contact that belongs to someone else', async () => {
    const { deps, replies } = setup();
    await handleUpdate(deps, msg({ contact: { phone_number: '2348031234567', user_id: 999 } }));
    expect(deps.completeLink).not.toHaveBeenCalled();
    expect(replies[0].text).toMatch(/your own number/);
  });
  it('refuses a forwarded contact with no user id', async () => {
    const { deps } = setup();
    await handleUpdate(deps, msg({ contact: { phone_number: '2348031234567' } }));
    expect(deps.completeLink).not.toHaveBeenCalled();
  });
  it('refuses a number that is not Nigerian', async () => {
    const { deps, replies } = setup();
    await handleUpdate(deps, msg({ contact: { phone_number: '14155550123', user_id: 200 } }));
    expect(deps.completeLink).not.toHaveBeenCalled();
    expect(replies[0].text).toMatch(/Nigerian/);
  });
  it.each([['phone_mismatch', /not the one/], ['no_request', /expired/]] as const)('tells the person about %s', async (result, pattern) => {
    const { deps, replies } = setup({ completeLink: async () => result });
    await handleUpdate(deps, msg({ contact: { phone_number: '+2348031234567', user_id: 200 } }));
    expect(replies[0].text).toMatch(pattern);
  });
});

describe('other updates', () => {
  it('ignores groups, channels and junk', async () => {
    const { deps, replies } = setup();
    await handleUpdate(deps, msg({ text: `/start ${NONCE}` }, { id: 200, username: 'ada' }, { id: -5, type: 'group' }));
    await handleUpdate(deps, { edited_message: {} });
    await handleUpdate(deps, 'nonsense');
    await handleUpdate(deps, msg({ text: 'hello there' }));
    expect(deps.attachStart).not.toHaveBeenCalled();
    expect(replies).toHaveLength(0);
  });
});
