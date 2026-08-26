export type ThemeMode = 'dark' | 'light'

export function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  try {
    const saved = localStorage.getItem('theme')
    return saved === 'light' || saved === 'dark' ? saved : 'dark'
  } catch {
    return 'dark'
  }
}

export function oppositeTheme(theme: ThemeMode): ThemeMode {
  return theme === 'dark' ? 'light' : 'dark'
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute('data-theme', theme)
}

/** Inline boot: apply stored theme before paint (prevents dark FOUC). */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`
