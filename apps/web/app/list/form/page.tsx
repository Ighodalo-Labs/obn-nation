import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ListingForm } from '@/components/listing/ListingForm';
import { REF_COOKIE, validRef } from '@/lib/middleware/rules';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'List an item · OBN NATION' };

/** Signed-in people with a name only (PRD 6.3). Anyone else goes back to /list. */
async function requireNamedSeller(): Promise<void> {
  let ok = false;
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: me } = await supabase.from('profiles').select('full_name').eq('id', data.user.id).maybeSingle();
      ok = (me?.full_name ?? '').trim().length >= 2;
    }
  } catch {
    ok = false;
  }
  if (!ok) redirect('/list');
}

/** Region of the admin whose referral link the visitor used (PRD DF-1). Null when there is no valid link. */
async function regionFromRef(): Promise<string | null> {
  const code = validRef(cookies().get(REF_COOKIE)?.value);
  if (!code) return null;
  try {
    const { data } = await createServerSupabase().rpc('region_for_ref', { p_code: code });
    return typeof data === 'string' ? data : null;
  } catch {
    return null; // the database still forces the region when the listing is saved
  }
}

export default async function ListFormPage() {
  await requireNamedSeller();
  const lockedRegion = await regionFromRef();
  return (
    <AppShell>
      <ListingForm lockedRegion={lockedRegion} />
    </AppShell>
  );
}
