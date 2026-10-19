import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

// The key the review and private pages use too; index.html applies it before the first paint. Storage that is off
// still switches the page, unremembered. The icon shows the look a tap switches to: a moon on light, a sun on dark.
const THEME_KEY = 'wongstack-theme'

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  function toggle() {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem(THEME_KEY, next ? 'dark' : 'light') } catch { /* switched, not remembered */ }
    setDark(next)
  }
  return <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={dark ? 'Switch to light' : 'Switch to dark'} aria-pressed={dark} onClick={toggle}>
    {dark ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
  </Button>
}
