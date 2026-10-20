import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

const root = join(__dirname, '..');
const files = ['app', 'components', 'lib'].flatMap((d) => {
  try {
    return walk(join(root, d));
  } catch {
    return [];
  }
});

describe('server boundary (AGENTS.md rule 4)', () => {
  const clientFiles = files.filter((f) => /^\s*['"]use client['"]/.test(readFileSync(f, 'utf8')));

  it('finds the client files it is checking', () => {
    expect(clientFiles.length).toBeGreaterThan(0);
  });

  it('no client file imports a server-only module or reads secrets', () => {
    for (const file of clientFiles) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/lib\/supabase\/(admin|server)/);
      expect(text, file).not.toMatch(/serverEnv|SERVICE_ROLE|TWILIO_|CRON_SECRET|SEND_SMS_HOOK_SECRET/);
      expect(text, file).not.toMatch(/lib\/whatsapp|lib\/edit-token/);
      expect(text, file).not.toMatch(/from '@\/lib\/env'/); // use '@/lib/env.public' in the browser
    }
  });

  it('the browser Supabase client reads only the public env file', () => {
    const text = readFileSync(join(root, 'lib/supabase/browser.ts'), 'utf8');
    expect(text).toMatch(/from '@\/lib\/env\.public'/);
    expect(text).not.toMatch(/from '@\/lib\/env'/);
  });

  it('the service-role client is marked server-only', () => {
    expect(readFileSync(join(root, 'lib/supabase/admin.ts'), 'utf8')).toMatch(/import 'server-only'/);
  });
});
