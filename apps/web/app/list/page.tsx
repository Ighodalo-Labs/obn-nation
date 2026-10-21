import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { SignInFlow } from '@/components/sign-in/SignInFlow';
import { safeNext } from '@/lib/middleware/rules';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in · OBN NATION' };

/** Signed-in admins get a shortcut (PRD SI-8). Any failure here just means "show the plain sign-in". */
async function isSignedInAdmin(): Promise<boolean> {
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return false;
    const { data: me } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
    return me?.role === 'regional_admin' || me?.role === 'global_admin';
  } catch {
    return false;
  }
}

export default async function ListPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = safeNext(searchParams.next);
  const admin = await isSignedInAdmin();
  return (
    <AppShell>
      {admin && (
        <Link href="/admin/dashboard" className="mb-3 inline-flex min-h-11 items-center justify-center rounded-full border border-white/25 px-5 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/25 disabled:hover:bg-transparent">
          Go to admin
        </Link>
      )}
      <SignInFlow next={next} />
    </AppShell>
  );
}
