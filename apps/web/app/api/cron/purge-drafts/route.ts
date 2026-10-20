import { handle, ok } from '@/lib/api/http';
import { purgeDrafts, type PurgeDeps } from '@/lib/cron/purge';
import { serverEnv } from '@/lib/env';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildDeps(): PurgeDeps {
  const admin = createAdminSupabase();
  return {
    purgeRows: async (days) => {
      const { data, error } = await admin.rpc('purge_stale_drafts', { p_days: days });
      if (error) throw new Error('purge failed');
      return (data as string[] | null) ?? [];
    },
    removeFolder: async (folder) => {
      let count = 0;
      for (const bucket of ['photos', 'videos'] as const) {
        const { data } = await admin.storage.from(bucket).list(folder, { limit: 100 });
        const names = (data ?? []).map((o) => `${folder}/${o.name}`);
        if (names.length) {
          await admin.storage.from(bucket).remove(names);
          count += names.length;
        }
      }
      return count;
    },
  };
}

/** Called once a day by Vercel Cron, which sends `Authorization: Bearer <CRON_SECRET>`. */
export const GET = handle(async (req) => ok(await purgeDrafts(buildDeps(), req.headers.get('authorization'), serverEnv().CRON_SECRET)));
