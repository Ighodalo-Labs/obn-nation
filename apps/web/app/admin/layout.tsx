import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/plus-jakarta-sans';
import type { ReactNode } from 'react';

// Runs before the first paint of the admin pages: picks the saved theme, or the system one, and puts it on the wrapper.
const THEME_SCRIPT = `(function(){var el=document.currentScript&&document.currentScript.parentElement;if(!el)return;var t='light';try{var s=localStorage.getItem('obn-admin-theme');if(s==='light'||s==='dark'){t=s}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){t='dark'}}catch(e){}el.setAttribute('data-admin-theme',t)})();`;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-theme" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      {children}
    </div>
  );
}
