import Link from 'next/link';

const link = 'flex min-h-12 flex-1 items-center justify-center rounded-lg px-2 text-sm';

/** Top navigation for the admin screens. The Global tab is shown to Global Admins only (the page itself checks again). */
export function AdminNav({ current, isGlobal }: { current: 'review' | 'pool' | 'global'; isGlobal: boolean }) {
  const items = [
    { id: 'review', href: '/admin/dashboard', label: 'Review' },
    { id: 'pool', href: '/admin/pool', label: 'Pool' },
    ...(isGlobal ? [{ id: 'global', href: '/admin/global', label: 'Global' }] : []),
  ] as const;
  return (
    <nav aria-label="Admin" className="flex gap-1 border-b border-border pb-2">
      {items.map((i) => (
        <Link key={i.id} href={i.href} aria-current={current === i.id ? 'page' : undefined}
          className={`${link} ${current === i.id ? 'bg-surface text-white ring-1 ring-border' : 'text-muted'}`}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
