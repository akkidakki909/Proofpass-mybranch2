import { useEffect, useRef } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Home from './components/Home.jsx'
import Verify from './components/Verify.jsx'
import Legal from './components/Legal.jsx'
import { PRIVACY, TERMS } from './legal.js'
import { RM } from './lib.js'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  const { pathname } = useLocation()
  const cur = useRef()
  const home = pathname === '/'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    if (RM) return
    let st = null
    try {
      st = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => gsap.set('#pb', { scaleX: s.progress }) })
    } catch (e) {
      console.error(e)
    }
    return () => {
      if (st) st.kill()
    }
  }, [pathname])

  useEffect(() => {
    if (RM || !matchMedia('(pointer:fine)').matches) return
    const c = cur.current
    const qx = gsap.quickTo(c, 'x', { duration: 0.25 })
    const qy = gsap.quickTo(c, 'y', { duration: 0.25 })
    let mg = null
    const move = (e) => {
      c.style.opacity = 0.9
      qx(e.clientX - 7)
      qy(e.clientY - 7)
      c.classList.toggle('h', !!e.target.closest('a,button,.state-card'))
      const b = e.target.closest('.mg')
      if (mg && mg !== b) gsap.to(mg, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,.4)' })
      mg = b
      if (b) {
        const r = b.getBoundingClientRect()
        gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.3 })
      }
    }
    document.addEventListener('mousemove', move)
    return () => document.removeEventListener('mousemove', move)
  }, [])

  return (
    <>
      <div id="pb" />
      <div className="cur" ref={cur} />
      <header>
        <div className="w">
          <Link className="lg" to="/">Proof<i>Pass</i></Link>
          <nav>
            {home ? (
              <>
                <a href="#states">States</a>
                <a href="#demo">Preview</a>
                <a href="#flow">Pipeline</a>
                <a href="#views">Views</a>
                <Link to="/verify" className="nav-verify-link">Verify</Link>
              </>
            ) : (
              <>
                <Link to="/">Home</Link>
                <Link to="/verify" className={pathname === '/verify' ? 'nav-verify-link active' : 'nav-verify-link'}>Verify</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/privacy" element={<Legal doc={PRIVACY} />} />
        <Route path="/terms" element={<Legal doc={TERMS} />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <footer>
        <span>ProofPass is a prototype. All data shown is sample data and nothing you type leaves this page.</span>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms and Conditions</Link>
      </footer>
    </>
  )
}
