import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { RM } from '../lib.js'

export default function HalfStepper({
  steps,
  current,
  status,
  previewStep,
  onSelect,
  onPreview,
  onClearPreview,
}) {
  const [radius, setRadius] = useState(() => {
    if (typeof window === 'undefined') return 200
    return Math.min(250, Math.max(150, Math.round(window.innerHeight * 0.25)))
  })
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 900
  })
  const [hoveredStep, setHoveredStep] = useState(null)
  const dialRef = useRef(null)

  // Track state in refs for wheel handling
  const stateRef = useRef({ current, previewStep, total: steps.length })
  stateRef.current = { current, previewStep, total: steps.length }

  // Responsive radius & mobile width listener
  useEffect(() => {
    const onResize = () => {
      const h = window.innerHeight
      const w = window.innerWidth
      const r = Math.min(250, Math.max(150, Math.round(h * 0.25)))
      setRadius(r)
      setIsMobile(w < 900)
      // Provide dial width variable for page padding
      document.documentElement.style.setProperty('--dial-width', `${r + 56}px`)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Mouse wheel over dial: moves through later stages one at a time, falls through at ends
  useEffect(() => {
    const el = dialRef.current
    if (!el) return

    let acc = 0
    let lastStep = 0
    let lastEvt = 0

    const onWheel = (e) => {
      if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return
      const dir = Math.sign(e.deltaY)
      if (!dir) return

      const { current: cur, previewStep: prev, total } = stateRef.current
      const active = prev !== null ? prev : cur

      // At bounds: fall through to page scroll
      if (dir < 0 && active <= cur) return // already at current step, scrolling up falls through
      if (dir > 0 && active >= total - 1) return // already at last step, scrolling down falls through

      // Consume the event inside valid step transitions
      e.preventDefault()
      e.stopPropagation()

      const now = performance.now()
      if (now - lastEvt > 220) acc = 0
      lastEvt = now
      if (now - lastStep < 250) return // trackpad inertia debounce

      acc += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      if (Math.abs(acc) < 28) return
      acc = 0
      lastStep = now

      const nextTarget = active + dir
      if (nextTarget === cur) {
        onClearPreview()
      } else if (nextTarget > cur && nextTarget < total) {
        onPreview(nextTarget)
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onPreview, onClearPreview])

  // Keyboard navigation when dial has focus
  const handleKeyDown = (e) => {
    const active = previewStep !== null ? previewStep : current
    if (e.key === 'ArrowDown') {
      if (active < steps.length - 1) {
        e.preventDefault()
        onPreview(active + 1)
      }
    } else if (e.key === 'ArrowUp') {
      if (active > current) {
        e.preventDefault()
        if (active - 1 === current) {
          onClearPreview()
        } else {
          onPreview(active - 1)
        }
      }
    }
  }

  const handleNodeClick = (id) => {
    if (id === current) {
      if (previewStep !== null) onClearPreview()
      return
    }
    if (id < current) {
      onSelect(id)
      if (previewStep !== null) onClearPreview()
    } else {
      onPreview(id)
    }
  }

  // Geometry calculations for true semicircle dial
  // Center is at (0, cy)
  const cy = radius + 28
  const totalW = radius + 48
  const totalH = (radius + 28) * 2

  // Angles: step 0 at top (-76 deg), step 8 at bottom (+76 deg)
  const angleStart = -76
  const angleEnd = 76
  const angleSpan = angleEnd - angleStart

  const getNodeCoords = (id) => {
    const deg = angleStart + (id / (steps.length - 1)) * angleSpan
    const rad = (deg * Math.PI) / 180
    const x = radius * Math.cos(rad)
    const y = cy + radius * Math.sin(rad)
    return { x, y }
  }

  const pt0 = getNodeCoords(0)
  const pt8 = getNodeCoords(8)

  // Track arc path from step 0 to step 8
  const trackPath = `M ${pt0.x} ${pt0.y} A ${radius} ${radius} 0 0 1 ${pt8.x} ${pt8.y}`
  // Total arc length
  const totalArcLength = radius * ((angleSpan * Math.PI) / 180)
  const progressRatio = Math.max(0, Math.min(1, current / (steps.length - 1)))
  const strokeDashoffset = totalArcLength * (1 - progressRatio)

  // Half disc SVG path: flat edge on left (x=0), circular arc bulging right
  const discR = radius + 22
  const discPath = `M 0 0 L 0 ${totalH} A ${discR} ${discR} 0 0 0 0 0 Z`

  // Stage in readout: priority = hovered, then previewed, then current
  const readoutStepId = hoveredStep !== null ? hoveredStep : previewStep !== null ? previewStep : current
  const readoutStep = steps[readoutStepId] || steps[0]

  let readoutStatus = 'In progress'
  if (readoutStepId < current || status[readoutStepId] === 'done') {
    readoutStatus = 'Done'
  } else if (readoutStepId > current) {
    readoutStatus = 'Locked'
  }

  // Mobile Chip Row (< 900px wide)
  const mobileChips = (
    <nav className="mobile-chip-stepper" aria-label="Pipeline stages">
      <div className="mobile-chip-scroll">
        {steps.map((st) => {
          const isDone = st.id < current || status[st.id] === 'done'
          const isCurrent = st.id === current && previewStep === null
          const isPreviewed = previewStep === st.id
          const isLocked = st.id > current && !isPreviewed

          let stateClass = 'chip-locked'
          if (isCurrent) stateClass = 'chip-current'
          else if (isPreviewed) stateClass = 'chip-previewed'
          else if (isDone) stateClass = 'chip-done'

          return (
            <button
              key={st.id}
              type="button"
              className={`mobile-chip ${stateClass}`}
              onClick={() => handleNodeClick(st.id)}
              aria-label={`Step 0${st.id}: ${st.title} (${isDone ? 'Done' : isCurrent ? 'Current' : 'Locked'})`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className="chip-digit">{st.id}</span>
              {isDone && (
                <span className="chip-badge badge-done" aria-hidden="true">
                  ✓
                </span>
              )}
              {isLocked && (
                <span className="chip-badge badge-locked" aria-hidden="true">
                  <svg viewBox="0 0 12 12" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="8" height="6" rx="1.5" />
                    <path d="M4 5V3.5a2 2 0 1 1 4 0V5" />
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )

  // Desktop Semicircle Dial
  const desktopDial = (
    <aside
      className="half-stepper-dial"
      ref={dialRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Pipeline progression dial"
      style={{
        width: `${totalW}px`,
        height: `${totalH}px`,
      }}
    >
      {/* Semicircle Backdrop SVG */}
      <svg
        className="half-dial-svg"
        width={totalW}
        height={totalH}
        viewBox={`0 0 ${totalW} ${totalH}`}
        aria-hidden="true"
      >
        {/* Disc surface */}
        <path d={discPath} className="half-dial-disc" />

        {/* Dashed track */}
        <path d={trackPath} className="half-dial-track" />

        {/* Animated orange progress stroke */}
        <path
          d={trackPath}
          className="half-dial-progress"
          style={{
            strokeDasharray: totalArcLength,
            strokeDashoffset: RM ? 0 : strokeDashoffset,
          }}
        />
      </svg>

      {/* Large Readout inside the half disc */}
      <div className="half-dial-readout" aria-live="polite">
        <div className="half-dial-stage-num m">0{readoutStepId}</div>
        <div className="half-dial-stage-title">{readoutStep.title}</div>
        <div className={`half-dial-stage-status m status-${readoutStatus.toLowerCase().replace(/\s+/g, '-')}`}>
          <span className="half-dial-status-dot" />
          <span>{readoutStatus}</span>
        </div>
      </div>

      {/* 9 Numbered Circular Nodes along the arc */}
      <div className="half-dial-nodes">
        {steps.map((st) => {
          const { x, y } = getNodeCoords(st.id)
          const isDone = st.id < current || status[st.id] === 'done'
          const isCurrent = st.id === current && previewStep === null
          const isPreviewed = previewStep === st.id
          const isLocked = st.id > current && !isPreviewed

          let nodeClass = 'node-locked'
          if (isCurrent) nodeClass = 'node-current'
          else if (isPreviewed) nodeClass = 'node-previewed'
          else if (isDone) nodeClass = 'node-done'

          return (
            <button
              key={st.id}
              type="button"
              className={`half-node-btn ${nodeClass}`}
              style={{
                left: `${x}px`,
                top: `${y}px`,
              }}
              onClick={() => handleNodeClick(st.id)}
              onMouseEnter={() => setHoveredStep(st.id)}
              onMouseLeave={() => setHoveredStep(null)}
              onFocus={() => setHoveredStep(st.id)}
              onBlur={() => setHoveredStep(null)}
              aria-label={`Step 0${st.id}: ${st.title} (${isDone ? 'Done' : isCurrent ? 'In progress' : isPreviewed ? 'Previewed' : 'Locked'})`}
              aria-current={isCurrent ? 'step' : undefined}
              title={
                isDone
                  ? `Return to Step 0${st.id}: ${st.title}`
                  : isLocked
                  ? `Step 0${st.id} is locked. Click to preview.`
                  : st.title
              }
            >
              <span className="half-node-digit m">{st.id}</span>

              {/* Status pins */}
              {isDone && (
                <span className="half-node-pin pin-done" aria-hidden="true">
                  <svg viewBox="0 0 12 12" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 6.2l2.3 2.3 4.7-5" />
                  </svg>
                </span>
              )}
              {isLocked && (
                <span className="half-node-pin pin-locked" aria-hidden="true">
                  <svg viewBox="0 0 14 14" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="6" width="8" height="6" rx="1.5" />
                    <path d="M5 6V4a2 2 0 1 1 4 0v2" />
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Peek Ahead Hint under the dial */}
      <div className="half-dial-hint m" aria-hidden="true">
        <span className="half-dial-mouse" />
        <span>Scroll here to peek ahead</span>
      </div>
    </aside>
  )

  // Portal into document.body so transformed ancestors do not affect fixed positioning
  if (typeof document === 'undefined') return null

  return (
    <>
      {createPortal(
        <div className="half-stepper-portal-root">
          {desktopDial}
          {mobileChips}
        </div>,
        document.body
      )}
    </>
  )
}

