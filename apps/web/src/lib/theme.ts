import { useEffect, useState } from 'react';
export type ThemePreference = 'light' | 'dark' | 'system';
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    try { const value = localStorage.getItem('auralis-theme'); return value === 'light' || value === 'dark' ? value : 'system'; } catch { return 'system'; }
  });
  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = preference === 'system' ? (query.matches ? 'dark' : 'light') : preference; };
    apply(); query.addEventListener('change', apply);
    try { localStorage.setItem('auralis-theme', preference); } catch { /* Session-only preference when storage is unavailable. */ }
    return () => query.removeEventListener('change', apply);
  }, [preference]);
  return [preference, setPreference] as const;
}
