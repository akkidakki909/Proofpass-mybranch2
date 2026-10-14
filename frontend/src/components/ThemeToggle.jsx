import { useState } from 'react'
import { applyTheme, currentTheme } from '../lib.js'

export default function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme)
  const next = theme === 'dark' ? 'light' : 'dark'

  const toggle = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    applyTheme(next, { x: r.left + r.width / 2, y: r.top + r.height / 2 })
    setTheme(next)
  }

  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      <svg className="theme-icon sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
      </svg>
      <svg className="theme-icon moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 14.2A8 8 0 0 1 9.8 4 8 8 0 1 0 20 14.2Z" />
      </svg>
    </button>
  )
}
