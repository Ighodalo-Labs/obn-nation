import { redirect } from 'next/navigation';
import { Header } from '@/components/Header';
import { ListingForm } from '@/components/listing/ListingForm';
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

export default async function ListFormPage() {
  await requireNamedSeller();
  return (
    <main>
      <Header />
      <ListingForm lockedRegion={null} />
    </main>
  );
}
