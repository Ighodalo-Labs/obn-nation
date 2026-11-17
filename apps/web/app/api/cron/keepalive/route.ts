import { handle, ok } from '@/lib/api/http';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Called once a day by Vercel Cron. It reads one row so the Supabase free plan sees activity and does not pause the project.
 * It needs no secret and returns nothing but "ok", so it exposes no data.
 */
export const GET = handle(async () => {
  const { error } = await createAdminSupabase().from('profiles').select('id').limit(1);
  if (error) throw new Error(`database call failed: ${error.message}`);
  return ok({ ok: true });
});
