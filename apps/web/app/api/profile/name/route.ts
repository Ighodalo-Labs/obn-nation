import { ApiError, mapDbError } from '@/lib/api/errors';
import { handle, ok, readJson, requireSameOrigin } from '@/lib/api/http';
import { nameSchema } from '@/lib/auth/name';
import { publicEnv } from '@/lib/env';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** Saves the signed-in person's own name. Row level security and the column grant allow only full_name. */
export const PATCH = handle(async (req) => {
  requireSameOrigin(req, new URL(publicEnv().NEXT_PUBLIC_SITE_URL).origin);
  const { full_name } = await readJson(req, nameSchema);
  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new ApiError('unauthenticated');

  const { data, error } = await supabase.from('profiles').update({ full_name }).eq('id', auth.user.id).select('full_name').maybeSingle();
  if (error) throw mapDbError(error) ?? new ApiError('internal_error');
  if (!data) throw new ApiError('account_blocked'); // row level security hides profiles that are not usable
  return ok({ full_name: data.full_name });
});
