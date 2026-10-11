import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DATA, FLOW, L, STATES, VIEWS } from '../data.js'
import { RM } from '../lib.js'

gsap.registerPlugin(ScrollTrigger)
const HERO = 'Every skill on your resume, linked to the file that proves it.'
const TICKER = Object.values(DATA).flat().map((x) => `${x.n} / ${L[x.s]}`)

export default function Home() {
  const root = useRef()
  const progress = useRef(0)
  const [tab, setTab] = useState('Candidate')

  useEffect(() => {
    const heroEl = root.current?.querySelector('#hero')
    if (!heroEl) return
    
    let ctx = null
    try {
      ctx = gsap.context(() => {
        if (RM) return
        gsap.from('.hero-w', { yPercent: 110, rotate: 5, duration: 1.1, stagger: 0.06, ease: 'power4.out', delay: 0.15 })
        gsap.from('#hero .lead, #hero .hero-actions, #hero .hero-pipeline-preview', { y: 30, opacity: 0, duration: 0.9, stagger: 0.12, delay: 0.75 })
        
        gsap.utils.toArray('.rv').forEach((el) =>
          gsap.from(el, { y: 45, opacity: 0, duration: 0.85, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } })
        )
        ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 1, onUpdate: (s) => (progress.current = s.progress) })
      }, root)
    } catch (e) {
      console.error(e)
    }
    return () => {
      if (ctx) ctx.revert()
    }
  }, [])

  const v = VIEWS[tab]
  return (
    <div ref={root} className="site-wrapper">
      <section id="hero" className="sec hero">
        <div className="w hero-container">
          <div className="hero-content">
            <div className="hero-eyebrow">
              <span className="k m">Skill passport / evidence-first hiring</span>
            </div>
            <h1>
              {HERO.split(' ').map((w, i) => (
                <span key={i}>
                  <span className="wd"><span className="hero-w">{w}</span></span>{' '}
                </span>
              ))}
            </h1>
            <p className="lead">
              ProofPass checks each claimed skill against real commits and certificates, then labels it Verified, Supported, Claimed or Contradicted. Recruiters see the evidence behind every label.
            </p>
            <div className="hero-actions">
              <Link className="b mg" to="/verify">
                Verify a passport <span className="btn-arrow" aria-hidden="true">-&gt;</span>
              </Link>
              <a className="b g mg" href="#flow">
                How pipeline works
              </a>
            </div>

            {/* Step-by-Step Pipeline Structure Preview in Hero */}
            <div className="hero-pipeline-preview">
              <div className="preview-header">
                <span className="preview-label m">PIPELINE FLOW</span>
                <span className="preview-badge m">8 STEPS</span>
              </div>
              <div className="hero-pipeline-steps">
                <div className="h-step active">
                  <span className="h-step-idx">01</span>
                  <span className="h-step-txt">Read</span>
                </div>
                <span className="h-step-arr">-&gt;</span>
                <div className="h-step">
                  <span className="h-step-idx">02</span>
                  <span className="h-step-txt">Propose</span>
                </div>
                <span className="h-step-arr">-&gt;</span>
                <div className="h-step">
                  <span className="h-step-idx">03</span>
                  <span className="h-step-txt">Evidence</span>
                </div>
                <span className="h-step-arr">-&gt;</span>
                <div className="h-step">
                  <span className="h-step-idx">04</span>
                  <span className="h-step-txt">Authorship</span>
                </div>
                <span className="h-step-arr">-&gt;</span>
                <div className="h-step highlight">
                  <span className="h-step-idx">08</span>
                  <span className="h-step-txt">SHA-256 Seal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mq" aria-hidden="true">
        <div>{[...TICKER, ...TICKER].map((t, i) => <span key={i}>{t}</span>)}</div>
      </div>

      <section id="states" className="sec">
        <div className="w">
          <span className="k m">Trust states</span>
          <h2 className="rv">Four states for every skill.</h2>
          <p className="rv lede">Each skill ends in exactly one state, decided by what the evidence shows.</p>
          <div className="cards">
            {STATES.map(([s, t]) => (
              <div className="state-card rv" key={s}>
                <div className="state-card-top">
                  <span className={`chip ${s}`}>{L[s]}</span>
                  <span className="state-code m">STATUS::{s}</span>
                </div>
                <p>{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="sec">
        <div className="w">
          <span className="k m">Live verifier / real evidence engine</span>
          <h2 className="rv">Run the check yourself.</h2>
          <p className="rv lede">Run your real resume and evidence through our 8-stage verification pipeline with deterministic code checks, authorship calculation, micro-checks, role matching, and SHA-256 seal.</p>
          <div className="demo-preview-card rv">
            <div className="demo-preview-content">
              <div className="demo-preview-tags">
                <span className="chip verified">Verified 100%</span>
                <span className="chip supported">Supported 60%</span>
                <span className="chip claimed">Claimed 20%</span>
                <span className="chip contradicted">Contradicted 0%</span>
              </div>
              <h3>Interactive 8-Step Verification Pipeline</h3>
              <p>Upload a PDF/DOCX resume or paste text, attach a GitHub repository or project ZIP, and watch the deterministic engine verify claims line by line.</p>
              <div className="demo-preview-stats">
                <div className="preview-stat-item">
                  <span className="stat-label m">Pipeline</span>
                  <span className="stat-val m">8 Stages</span>
                </div>
                <div className="preview-stat-item">
                  <span className="stat-label m">Security</span>
                  <span className="stat-val m">SHA-256</span>
                </div>
                <div className="preview-stat-item">
                  <span className="stat-label m">Reporting</span>
                  <span className="stat-val m">Candidate / Recruiter / Placement</span>
                </div>
              </div>
              <div className="demo-preview-actions">
                <Link to="/verify" className="b mg">
                  Launch Verification Suite <span className="btn-arrow" aria-hidden="true">-&gt;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Connected 5-Step Pipeline Structure Section */}
      <section id="flow" className="sec">
        <div className="w">
          <span className="k m">Pipeline Architecture</span>
          <h2 className="rv">A model proposes. Plain code decides.</h2>
          <p className="rv lede">The verification follows a strict deterministic pipeline. Language models propose candidates, but immutable git commits and cryptographic hashing decide the final state.</p>
          
          <div className="pipeline-flow-track rv">
            {FLOW.map(([h, p], i) => (
              <div className="pipeline-flow-node" key={h}>
                <div className="node-step-bar">
                  <span className="node-badge m">STEP 0{i + 1}</span>
                  {i < FLOW.length - 1 && <span className="node-arrow" aria-hidden="true">-&gt;</span>}
                </div>
                <div className="node-card">
                  <div className="node-card-top">
                    <span className="node-card-num">0{i + 1}</span>
                    <span className="node-card-pill m">
                      {i === 0 && 'INPUT STAGE'}
                      {i === 1 && 'LLM ENGINE'}
                      {i === 2 && 'DETERMINISTIC'}
                      {i === 3 && 'GIT BLAME'}
                      {i === 4 && 'CRYPTOGRAPHY'}
                    </span>
                  </div>
                  <h3>{h}</h3>
                  <p>{p}</p>
                  <div className="node-payload m">
                    {i === 0 && 'Payload: Resume PDF + Git URL'}
                    {i === 1 && 'Payload: Claim & File Pointers'}
                    {i === 2 && 'Payload: Git Blob Integrity'}
                    {i === 3 && 'Payload: Author Contribution %'}
                    {i === 4 && 'Payload: Final SHA-256 Stamp'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="views" className="sec">
        <div className="w">
          <span className="k m">Three views of one passport</span>
          <h2 className="rv">Candidate, recruiter, placement cell.</h2>
          <div className="tb">
            {Object.keys(VIEWS).map((k) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{k}</button>
            ))}
          </div>
          <div className="pn vp" key={tab}>
            <h3>{v[0]}</h3>
            <p className="ev">{v[1]}</p>
            <ul>{v[2].map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </div>
      </section>

      <section id="cta" className="sec">
        <div className="w">
          <h2 className="rv">See the evidence behind every skill.</h2>
          <p className="rv">Candidates get a plan. Recruiters get evidence, not a single hire score.</p>
          <Link className="b mg" to="/verify">
            Run verification <span className="btn-arrow" aria-hidden="true">-&gt;</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
