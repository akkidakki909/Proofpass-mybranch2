export const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion:reduce)').matches
export const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

export function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

// Applies and stores a theme. Uses a circular View Transition reveal when the browser supports it.
export function applyTheme(next, origin) {
  const set = () => {
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('pp-theme', next) } catch (e) { /* storage can be blocked */ }
  }
  if (RM || !document.startViewTransition) {
    set()
    return
  }
  const x = origin ? origin.x : innerWidth - 40
  const y = origin ? origin.y : 32
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
  const t = document.startViewTransition(set)
  t.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 650, easing: EASE, pseudoElement: '::view-transition-new(root)' }
      )
    })
    .catch(() => {})
}

// Shared handle to the smooth scroller so route changes and anchor links can use it
export const scroller = { lenis: null }

export function scrollToTarget(target, opts = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (!el) return
  if (scroller.lenis) scroller.lenis.scrollTo(el, { offset: -72, duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4), ...opts })
  else el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' })
}
