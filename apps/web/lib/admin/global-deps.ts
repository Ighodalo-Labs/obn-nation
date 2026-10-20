import 'server-only';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import type { GlobalDeps } from './global';

/** Roles are checked in the database on every call (is_global_admin()). The service role is used only for the login and the ban. */
export function buildGlobalDeps(): GlobalDeps {
  const db = createServerSupabase(); // the signed-in Global Admin
  const admin = createAdminSupabase();
  return {
    findProfileByPhone: async (phone) => {
      const { data } = await admin.from('profiles').select('id, role, is_blacklisted, full_name').eq('phone', phone).maybeSingle();
      return data ?? null;
    },
    createLogin: async (phone) => {
      const { data, error } = await admin.auth.admin.createUser({ phone, phone_confirm: true });
      if (error || !data.user) throw new Error('could not create login');
      return data.user.id;
    },
    setName: async (id, name) => {
      await admin.from('profiles').update({ full_name: name }).eq('id', id);
    },
    promote: async (id, role, region) => {
      const { data, error } = await db.rpc('promote_to_admin', { p_profile: id, p_role: role, p_region: region });
      return { code: typeof data === 'string' ? data : null, error };
    },
    revoke: async (id, reason) => (await db.rpc('revoke_admin', { p_profile: id, p_reason: reason })).error,
    reinstate: async (id) => (await db.rpc('reinstate_admin', { p_profile: id })).error,
    reassign: async (listing, to, reason) => (await db.rpc('reassign_listing', { p_listing: listing, p_new_admin: to, p_reason: reason })).error,
    blacklist: async (actor, id, reason) => (await admin.rpc('blacklist_admin', { p_actor: actor, p_profile: id, p_reason: reason })).error,
    banLogin: async (id) => {
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: '876000h' });
      return !error;
    },
  };
}
