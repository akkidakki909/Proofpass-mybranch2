import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import Home from './components/Home.jsx'
import Legal from './components/Legal.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import { PRIVACY, TERMS } from './legal.js'
import { RM, scroller, scrollToTarget } from './lib.js'

gsap.registerPlugin(ScrollTrigger)

const Verify = lazy(() => import('./components/Verify.jsx'))

const SECTIONS = [
  ['states', 'States'],
  ['scoring', 'Scoring'],
  ['pipeline', 'Pipeline'],
  ['views', 'Views'],
]

function Mark() {
  return (
    <svg className="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" />
      <rect x="7" y="8" width="18" height="4" />
      <rect x="7" y="15" width="12" height="4" />
    </svg>
  )
}

export default function App() {
  const { pathname } = useLocation()
  const home = pathname === '/'
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [current, setCurrent] = useState('')
  const openRef = useRef(false)
  openRef.current = open

  // Smooth scroll (Lenis) wired into GSAP's ticker so ScrollTrigger stays in sync
  useEffect(() => {
    if (RM) return
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
    scroller.lenis = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (t) => lenis.raf(t * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
      scroller.lenis = null
    }
  }, [])

  // New page: go to top, close the menu
  useEffect(() => {
    if (scroller.lenis) scroller.lenis.scrollTo(0, { immediate: true, force: true })
    else window.scrollTo(0, 0)
    setOpen(false)
    setHidden(false)
    setCurrent('')
    ScrollTrigger.refresh()
  }, [pathname])

  // Header: solid after the top, tucks away on scroll down, returns on scroll up
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 8)
      if (y > 480 && y > last + 6 && !openRef.current) setHidden(true)
      else if (y < last - 6 || y < 480) setHidden(false)
      last = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Scroll progress bar
  useEffect(() => {
    if (RM) return
    const st = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => gsap.set('#pb', { scaleX: s.progress }) })
    return () => st.kill()
  }, [pathname])

  // Highlight the nav link for the section in view
  useEffect(() => {
    if (!home) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setCurrent(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' }
    )
    SECTIONS.forEach(([id]) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [home])

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  // In-page anchors go through the smooth scroller
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]')
      if (!a || a.getAttribute('href') === '#') return
      const el = document.querySelector(a.getAttribute('href'))
      if (!el) return
      e.preventDefault()
      setOpen(false)
      scrollToTarget(el)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <div id="pb" aria-hidden="true" />
      <header className={`site-header${scrolled ? ' scrolled' : ''}${hidden ? ' hide' : ''}${open ? ' menu-open' : ''}`}>
        <div className="w bar">
          <Link className="logo" to="/"><Mark /><span>Proof<i>Pass</i></span></Link>
          <nav id="primary-nav" className={`site-nav${open ? ' open' : ''}`} aria-label="Primary">
            {home ? (
              SECTIONS.map(([id, label]) => (
                <a key={id} href={`#${id}`} aria-current={current === id ? 'true' : undefined}>{label}</a>
              ))
            ) : (
              <Link to="/">Home</Link>
            )}
            <Link to="/verify" className="nav-verify-mobile" style={{ display: open ? undefined : 'none' }}>Verify</Link>
          </nav>
          <div className="bar-actions">
            <ThemeToggle />
            <Link to="/verify" className="b sm">Verify</Link>
            <button
              type="button"
              className="icon-btn nav-toggle"
              aria-expanded={open}
              aria-controls="primary-nav"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((o) => !o)}
            >
              <span /><span />
            </button>
          </div>
        </div>
      </header>

      <div key={pathname}>
        <Suspense fallback={<main id="main" style={{ minHeight: '70vh' }} />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/privacy" element={<Legal doc={PRIVACY} />} />
          <Route path="/terms" element={<Legal doc={TERMS} />} />
          <Route path="*" element={<Home />} />
        </Routes>
        </Suspense>
      </div>

      <footer className="site-footer">
        <div className="w">
          <span>ProofPass is a prototype. All data shown is sample data and nothing you type leaves this page.</span>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms and Conditions</Link>
        </div>
      </footer>
    </>
  )
}
