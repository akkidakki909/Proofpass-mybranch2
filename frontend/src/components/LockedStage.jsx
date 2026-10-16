import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { RM } from '../lib.js'

const STEP_DEFINITIONS = [
  { id: 0, title: 'Intake', subtitle: 'Form and consent' },
  { id: 1, title: 'Read', subtitle: 'Parse resume and repo' },
  { id: 2, title: 'Propose', subtitle: 'Model skill pointers' },
  { id: 3, title: 'Check evidence', subtitle: 'Hash and file check' },
  { id: 4, title: 'Authorship', subtitle: 'Blame and usage depth' },
  { id: 5, title: 'Assign states', subtitle: 'Trust ceilings' },
  { id: 6, title: 'Micro-checks', subtitle: 'Code trade-off questions' },
  { id: 7, title: 'Role match', subtitle: 'Evidence-weighted match' },
  { id: 8, title: 'Issue passport', subtitle: 'SHA-256 seal' },
]

const STAGE_DESCRIPTIONS = {
  0: 'Provide candidate resume, evidence repo, and target role to initialize verification.',
  1: 'Parse resume structure and ingest repository tree, commit history, and source files.',
  2: 'Model candidate skill pointers and map them to concrete codebase implementations.',
  3: 'Compute SHA-256 integrity hashes and verify physical file evidence on disk.',
  4: 'Extract git blame authorship records and compute deep code contribution metrics.',
  5: 'Assign confidence states (Verified, Synthesized, Claimed, Flagged) with trust ceilings.',
  6: 'Deliver targeted code trade-off micro-checks to assess authentic technical comprehension.',
  7: 'Calculate evidence-weighted role alignment against job capability requirements.',
  8: 'Issue cryptographically sealed ProofPass passport with verifiable signature.',
}

function generateChainLinks(p0, p1, p2, linkSpacing = 16) {
  const samples = []
  const N = 100
  let totalLength = 0
  let lastPt = { x: p0.x, y: p0.y }

  for (let i = 0; i <= N; i++) {
    const t = i / N
    const mt = 1 - t
    const x = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x
    const y = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
    const dx = 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x)
    const dy = 2 * mt * (p1.y - p0.y) + 2 * t * (p2.y - p1.y)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI

    if (i > 0) {
      totalLength += Math.hypot(x - lastPt.x, y - lastPt.y)
    }
    samples.push({ t, x, y, angle, dist: totalLength })
    lastPt = { x, y }
  }

  const links = []
  const count = Math.max(3, Math.floor(totalLength / linkSpacing))
  const stepSize = totalLength / count

  for (let j = 0; j <= count; j++) {
    const targetDist = j * stepSize
    let sample = samples[0]
    for (let k = 1; k < samples.length; k++) {
      if (samples[k].dist >= targetDist) {
        sample = samples[k]
        break
      }
    }
    links.push({
      x: sample.x,
      y: sample.y,
      angle: sample.angle,
      isFaceOn: j % 2 === 0,
    })
  }

  return links
}

export default function LockedStage({
  stepId,
  currentStep,
  onBack,
  onLookAt,
  rattleTrigger = 0,
}) {
  const cardRef = useRef(null)
  const chain1Ref = useRef(null)
  const chain2Ref = useRef(null)
  const chain3Ref = useRef(null)
  const lockRef = useRef(null)

  const [dims, setDims] = useState({ w: 800, h: 560 })

  // Measure card with ResizeObserver so chains always span it
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setDims({ w: Math.round(width), h: Math.round(height) })
        }
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Slide in chains, drop lock with swing
  useEffect(() => {
    if (RM) return
    if (chain1Ref.current) {
      gsap.fromTo(
        chain1Ref.current,
        { x: -75, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.55, ease: 'power2.out' }
      )
    }
    if (chain2Ref.current) {
      gsap.fromTo(
        chain2Ref.current,
        { x: 75, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.55, ease: 'power2.out', delay: 0.06 }
      )
    }
    if (chain3Ref.current) {
      gsap.fromTo(
        chain3Ref.current,
        { x: -65, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.55, ease: 'power2.out', delay: 0.1 }
      )
    }
    if (lockRef.current) {
      gsap.fromTo(
        lockRef.current,
        { y: -55, rotation: -14, opacity: 0 },
        { y: 0, rotation: 0, opacity: 1, duration: 0.7, ease: 'back.out(2)', delay: 0.16 }
      )
    }
  }, [stepId])

  // Replay rattle on lock when clicking another locked node
  useEffect(() => {
    if (RM || rattleTrigger === 0 || !lockRef.current) return
    gsap.timeline()
      .to(lockRef.current, { rotation: 9, x: 4, duration: 0.05 })
      .to(lockRef.current, { rotation: -8, x: -4, duration: 0.05 })
      .to(lockRef.current, { rotation: 6, x: 3, duration: 0.05 })
      .to(lockRef.current, { rotation: -4, x: -2, duration: 0.05 })
      .to(lockRef.current, { rotation: 0, x: 0, duration: 0.05 })
  }, [rattleTrigger])

  const stepDef = STEP_DEFINITIONS[stepId] || { title: 'Pipeline Stage' }
  const prevStep = Math.max(0, stepId - 1)
  const prevTitle = STEP_DEFINITIONS[prevStep]?.title || `Step 0${prevStep}`
  const isFar = stepId > currentStep + 1

  // Compute three chains converging on card center
  const { w, h } = dims
  const cx = w / 2
  const cy = h / 2

  const chains = useMemo(() => {
    // Chain 1: Top-Left to Bottom-Right through center
    const c1 = generateChainLinks(
      { x: -14, y: h * 0.12 },
      { x: cx, y: cy + 12 },
      { x: w + 14, y: h * 0.88 },
      17
    )
    // Chain 2: Top-Right to Bottom-Left through center
    const c2 = generateChainLinks(
      { x: w + 14, y: h * 0.12 },
      { x: cx, y: cy + 12 },
      { x: -14, y: h * 0.88 },
      17
    )
    // Chain 3: Lower horizontal run
    const c3 = generateChainLinks(
      { x: -14, y: h * 0.65 },
      { x: cx, y: h * 0.7 },
      { x: w + 14, y: h * 0.65 },
      17
    )
    return { c1, c2, c3 }
  }, [w, h, cx, cy])

  return (
    <div className="step-card glass locked-stage-card" ref={cardRef}>
      {/* Blurred & dimmed card content replica */}
      <div className="locked-card-backdrop" aria-hidden="true">
        <div className="step-card-header">
          <div>
            <span className="k m">STEP 0{stepId} / 08</span>
            <h2>{stepDef.title}</h2>
          </div>
          <div className="step-status-indicator m">STATUS: LOCKED</div>
        </div>

        <p className="step-desc">
          {STAGE_DESCRIPTIONS[stepId] || 'This verification stage is locked.'}
        </p>

        {/* Skeleton rows */}
        <div className="locked-skeleton-block">
          <div className="skeleton-bar skeleton-bar-wide" />
          <div className="skeleton-grid">
            <div className="skeleton-box" />
            <div className="skeleton-box" />
          </div>
          <div className="skeleton-table">
            <div className="skeleton-row header-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
          </div>
          <div className="skeleton-actions">
            <div className="skeleton-btn" />
            <div className="skeleton-btn" />
          </div>
        </div>
      </div>

      {/* Chains and Padlock Overlay */}
      <div className="locked-stage-overlay">
        <svg
          className="locked-chains-svg chains-sway"
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="steelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--steel-hi)" />
              <stop offset="50%" stopColor="var(--steel-mid)" />
              <stop offset="100%" stopColor="var(--steel-lo)" />
            </linearGradient>
            <linearGradient id="steelGradEdge" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--steel-hi)" />
              <stop offset="70%" stopColor="var(--steel-mid)" />
              <stop offset="100%" stopColor="var(--steel-lo)" />
            </linearGradient>
            <filter id="chainShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="1" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
            </filter>
            <filter id="lockShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Chain 1 */}
          <g ref={chain1Ref} className="chain-group">
            {chains.c1.map((link, i) => (
              <g key={`c1-${i}`} transform={`translate(${link.x}, ${link.y}) rotate(${link.angle})`}>
                {link.isFaceOn ? (
                  <rect
                    x="-9.5"
                    y="-5.5"
                    width="19"
                    height="11"
                    rx="4"
                    ry="4"
                    fill="none"
                    stroke="url(#steelGrad)"
                    strokeWidth="2.5"
                    filter="url(#chainShadow)"
                  />
                ) : (
                  <rect
                    x="-7.5"
                    y="-2.8"
                    width="15"
                    height="5.6"
                    rx="2"
                    ry="2"
                    fill="url(#steelGradEdge)"
                    stroke="var(--steel-lo)"
                    strokeWidth="0.8"
                    filter="url(#chainShadow)"
                  />
                )}
              </g>
            ))}
          </g>

          {/* Chain 2 */}
          <g ref={chain2Ref} className="chain-group">
            {chains.c2.map((link, i) => (
              <g key={`c2-${i}`} transform={`translate(${link.x}, ${link.y}) rotate(${link.angle})`}>
                {link.isFaceOn ? (
                  <rect
                    x="-9.5"
                    y="-5.5"
                    width="19"
                    height="11"
                    rx="4"
                    ry="4"
                    fill="none"
                    stroke="url(#steelGrad)"
                    strokeWidth="2.5"
                    filter="url(#chainShadow)"
                  />
                ) : (
                  <rect
                    x="-7.5"
                    y="-2.8"
                    width="15"
                    height="5.6"
                    rx="2"
                    ry="2"
                    fill="url(#steelGradEdge)"
                    stroke="var(--steel-lo)"
                    strokeWidth="0.8"
                    filter="url(#chainShadow)"
                  />
                )}
              </g>
            ))}
          </g>

          {/* Chain 3 (lower horizontal run) */}
          <g ref={chain3Ref} className="chain-group">
            {chains.c3.map((link, i) => (
              <g key={`c3-${i}`} transform={`translate(${link.x}, ${link.y}) rotate(${link.angle})`}>
                {link.isFaceOn ? (
                  <rect
                    x="-9.5"
                    y="-5.5"
                    width="19"
                    height="11"
                    rx="4"
                    ry="4"
                    fill="none"
                    stroke="url(#steelGrad)"
                    strokeWidth="2.5"
                    filter="url(#chainShadow)"
                  />
                ) : (
                  <rect
                    x="-7.5"
                    y="-2.8"
                    width="15"
                    height="5.6"
                    rx="2"
                    ry="2"
                    fill="url(#steelGradEdge)"
                    stroke="var(--steel-lo)"
                    strokeWidth="0.8"
                    filter="url(#chainShadow)"
                  />
                )}
              </g>
            ))}
          </g>
        </svg>

        {/* Central Padlock & Hanging Tag */}
        <div
          ref={lockRef}
          className="padlock-and-tag-assembly"
          style={{
            left: `${cx}px`,
            top: `${cy}px`,
          }}
        >
          {/* Padlock SVG */}
          <svg
            className="padlock-svg"
            width="64"
            height="72"
            viewBox="-32 -36 64 72"
            aria-hidden="true"
          >
            {/* Steel shackle */}
            <path
              d="M -15 -10 V -26 A 15 15 0 0 1 15 -26 V -10"
              fill="none"
              stroke="url(#steelGrad)"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            {/* Lock body */}
            <rect
              x="-27"
              y="-10"
              width="54"
              height="42"
              rx="6"
              fill="var(--lock-body)"
              stroke="var(--steel-mid)"
              strokeWidth="1.5"
            />
            {/* Thin orange top line */}
            <line
              x1="-23"
              y1="-7"
              x2="23"
              y2="-7"
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Keyhole */}
            <circle cx="0" cy="7" r="3.5" fill="var(--lock-hole)" />
            <polygon points="-2.2,8 2.2,8 1.4,16 -1.4,16" fill="var(--lock-hole)" />
          </svg>

          {/* Hanging tag ring link */}
          <div className="hanging-tag-ring" aria-hidden="true" />

          {/* Hanging Tag */}
          <div className="locked-hanging-tag" role="status">
            <div className="tag-grommet" aria-hidden="true" />
            <p className="tag-msg">
              {isFar
                ? `Complete the earlier stages first. Complete Step 0${prevStep}, ${prevTitle}, to unlock this stage.`
                : `Complete Step 0${prevStep}, ${prevTitle}, to unlock this stage.`}
            </p>
            <div className="tag-btn-row">
              <button
                type="button"
                className="b sm"
                onClick={onBack}
              >
                Back to step 0{currentStep}
              </button>
              {isFar && (
                <button
                  type="button"
                  className="b g sm"
                  onClick={() => onLookAt(prevStep)}
                >
                  Look at step 0{prevStep}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
