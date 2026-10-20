import 'server-only';
import { newEditToken } from '@/lib/edit-token';
import { publicEnv, serverEnv } from '@/lib/env';
import { deliverRejection } from '@/lib/rejection-sender';
import { createAdminSupabase } from '@/lib/supabase/admin';
import type { RejectDeps } from './reject';

/** Real dependencies for reject and reissue. Service role is used only after the route has checked the session. */
export function buildRejectDeps(): RejectDeps {
  const admin = createAdminSupabase();
  const env = serverEnv();
  return {
    newToken: () => {
      const t = newEditToken(publicEnv().NEXT_PUBLIC_SITE_URL);
      return { hash: t.hash, link: t.link };
    },
    saveRejection: async (actor, id, reason, hash) => {
      const { data, error } = await admin.rpc('reject_listing', { p_actor: actor, p_listing: id, p_reason: reason, p_token_hash: hash });
      return { expiresAt: typeof data === 'string' ? data : null, error };
    },
    saveReissue: async (actor, id, hash) => {
      const { data, error } = await admin.rpc('reissue_edit_link', { p_actor: actor, p_listing: id, p_token_hash: hash });
      return { expiresAt: typeof data === 'string' ? data : null, error };
    },
    loadSeller: async (id) => {
      const { data: l } = await admin.from('listings').select('title, rejection_reason, seller_id').eq('id', id).maybeSingle();
      if (!l) return null;
      const { data: p } = await admin.from('profiles').select('phone, full_name').eq('id', l.seller_id).maybeSingle();
      if (!p) return null;
      return { phone: p.phone, fullName: p.full_name ?? '', title: l.title, reason: l.rejection_reason ?? '' };
    },
    notify: (phone, details) => deliverRejection(env, phone, details),
  };
}
