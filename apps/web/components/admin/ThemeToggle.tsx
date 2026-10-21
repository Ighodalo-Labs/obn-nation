'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const KEY = 'obn-admin-theme';
type Theme = 'light' | 'dark';

/** Light and dark mode for the whole admin. The wrapper attribute is set before first paint by app/admin/layout.tsx. */
export function ThemeToggle({ variant = 'icon' }: { variant?: 'icon' | 'menu' }) {
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => {
    const el = document.querySelector('.admin-theme');
    setTheme(el?.getAttribute('data-admin-theme') === 'dark' ? 'dark' : 'light');
  }, []);

  function flip() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.querySelector('.admin-theme')?.setAttribute('data-admin-theme', next);
    try { localStorage.setItem(KEY, next); } catch { /* private window: the choice lasts until reload */ }
    setTheme(next);
  }

  const dark = theme === 'dark';
  const label = theme === null ? 'Switch colour mode' : dark ? 'Switch to light mode' : 'Switch to dark mode';
  const Icon = dark ? Sun : Moon;
  if (variant === 'menu') {
    return (
      <button type="button" role="menuitem" className="ops-menuitem" onClick={flip}>
        <Icon size={16} aria-hidden="true" />{theme === null ? 'Colour mode' : dark ? 'Light mode' : 'Dark mode'}
      </button>
    );
  }
  return (
    <button type="button" className="ops-iconbtn" onClick={flip} aria-label={label} title={label}>
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}
