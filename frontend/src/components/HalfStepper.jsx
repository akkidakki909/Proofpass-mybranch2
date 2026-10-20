import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
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

  const dialRef = useRef(null)
  const progressPathRef = useRef(null)
  const readoutRef = useRef(null)
  const readoutNumRef = useRef(null)
  const readoutTitleRef = useRef(null)
  const readoutStatusRef = useRef(null)
  const nodeRefs = useRef([])

  // Active continuous progress & animation tracking
  const activeStep = previewStep !== null ? previewStep : current
  const progressObj = useRef({ value: activeStep })
  const targetRef = useRef(activeStep)
  const activeTweenRef = useRef(null)
  const swappedRef = useRef(false)
  const accRef = useRef(0)
  const hoverRafRef = useRef(null)

  // Track props in refs for closures
  const currentRef = useRef(current)
  currentRef.current = current
  const previewStepRef = useRef(previewStep)
  previewStepRef.current = previewStep
  const statusRef = useRef(status)
  statusRef.current = status
  const stepsRef = useRef(steps)
  stepsRef.current = steps

  // Geometry calculations for true semicircle dial
  const cy = radius + 28
  const totalW = radius + 48
  const totalH = (radius + 28) * 2

  // Angles: step 0 at top (-76 deg), step 8 at bottom (+76 deg)
  const angleStart = -76
  const angleEnd = 76
  const angleSpan = angleEnd - angleStart

  const getNodeCoords = useCallback((id) => {
    const deg = angleStart + (id / (steps.length - 1)) * angleSpan
    const rad = (deg * Math.PI) / 180
    const x = radius * Math.cos(rad)
    const y = cy + radius * Math.sin(rad)
    return { x, y }
  }, [radius, cy, steps.length])

  const pt0 = getNodeCoords(0)
  const pt8 = getNodeCoords(steps.length - 1)
  const trackPath = `M ${pt0.x} ${pt0.y} A ${radius} ${radius} 0 0 1 ${pt8.x} ${pt8.y}`
  const totalArcLength = radius * ((angleSpan * Math.PI) / 180)
  const totalArcLengthRef = useRef(totalArcLength)
  totalArcLengthRef.current = totalArcLength

  const discR = radius + 22
  const discPath = `M 0 0 L 0 ${totalH} A ${discR} ${discR} 0 0 0 0 0 Z`

  // Direct DOM render function for ring progress, readout, and node transforms
  const renderRing = useCallback((p) => {
    const total = stepsRef.current.length
    const rounded = Math.max(0, Math.min(total - 1, Math.round(p)))
    const cur = currentRef.current
    const stList = stepsRef.current
    const stStatus = statusRef.current

    // 1. Progress arc
    if (progressPathRef.current) {
      const progressRatio = Math.max(0, Math.min(1, p / (total - 1)))
      const strokeDashoffset = totalArcLengthRef.current * (1 - progressRatio)
      progressPathRef.current.style.strokeDashoffset = `${strokeDashoffset}px`
    }

    // 2. Readout text
    if (readoutNumRef.current) {
      readoutNumRef.current.textContent = `0${rounded}`
    }
    if (readoutTitleRef.current && stList[rounded]) {
      readoutTitleRef.current.textContent = stList[rounded].title
    }
    if (readoutStatusRef.current) {
      let label = 'In progress'
      if (rounded < cur || stStatus[rounded] === 'done') {
        label = 'Done'
      } else if (rounded > cur) {
        label = 'Locked'
      }
      readoutStatusRef.current.className = `half-dial-stage-status m status-${label.toLowerCase().replace(/\s+/g, '-')}`
      const spanEl = readoutStatusRef.current.querySelector('span:last-child')
      if (spanEl) spanEl.textContent = label
    }

    // 3. Node transforms and classes
    for (let i = 0; i < total; i++) {
      const btn = nodeRefs.current[i]
      if (!btn) continue

      const dist = Math.abs(p - i)
      const scale = 1 + 0.14 * Math.max(0, 1 - dist)
      btn.style.transform = `translate3d(-50%, -50%, 0) scale(${scale.toFixed(3)})`

      const isDone = i < cur || stStatus[i] === 'done'
      const isCurrent = i === cur && rounded === cur
      const isPreviewed = rounded === i && i > cur
      const isLocked = i > cur && !isPreviewed

      btn.classList.toggle('node-current', isCurrent)
      btn.classList.toggle('node-previewed', isPreviewed)
      btn.classList.toggle('node-done', isDone && !isCurrent)
      btn.classList.toggle('node-locked', isLocked)
    }
  }, [])

  // Smooth tween to target stage
  const goToStage = useCallback((newTarget) => {
    const cur = currentRef.current
    const total = stepsRef.current.length
    const clampedTarget = Math.max(cur, Math.min(total - 1, newTarget))

    targetRef.current = clampedTarget
    swappedRef.current = false

    const movingEls = [
      progressPathRef.current,
      readoutRef.current,
      ...nodeRefs.current.filter(Boolean),
    ]
    movingEls.forEach((el) => {
      if (el) el.style.willChange = 'transform, opacity'
    })

    if (activeTweenRef.current) {
      activeTweenRef.current.kill()
    }

    activeTweenRef.current = gsap.to(progressObj.current, {
      value: clampedTarget,
      duration: RM ? 0 : 0.75,
      ease: 'power3.out',
      overwrite: true,
      onUpdate: () => {
        const p = progressObj.current.value
        renderRing(p)

        // Swap React state once at halfway point so main card swaps in time
        if (!swappedRef.current && Math.abs(p - clampedTarget) <= 0.5) {
          swappedRef.current = true
          if (clampedTarget === cur) {
            onClearPreview()
          } else {
            onPreview(clampedTarget)
          }
        }
      },
      onComplete: () => {
        if (!swappedRef.current) {
          swappedRef.current = true
          if (clampedTarget === cur) {
            onClearPreview()
          } else {
            onPreview(clampedTarget)
          }
        }
        movingEls.forEach((el) => {
          if (el) el.style.willChange = 'auto'
        })
        activeTweenRef.current = null
      },
    })
  }, [RM, onPreview, onClearPreview, renderRing])

  // Responsive radius & mobile listener
  useEffect(() => {
    const onResize = () => {
      const h = window.innerHeight
      const w = window.innerWidth
      const r = Math.min(250, Math.max(150, Math.round(h * 0.25)))
      setRadius(r)
      setIsMobile(w < 900)
      document.documentElement.style.setProperty('--dial-width', `${r + 56}px`)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Sync external current/previewStep changes with the continuous progress value
  useEffect(() => {
    const desired = previewStep !== null ? previewStep : current
    if (Math.abs(progressObj.current.value - desired) > 0.01 && (!activeTweenRef.current || !activeTweenRef.current.isActive())) {
      targetRef.current = desired
      progressObj.current.value = desired
      renderRing(desired)
    }
  }, [current, previewStep, renderRing])

  // Wheel listener on the ring
  useEffect(() => {
    const el = dialRef.current
    if (!el) return

    const onWheel = (e) => {
      if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return

      let dy = e.deltaY
      if (e.deltaMode === 1) dy *= 16
      else if (e.deltaMode === 2) dy *= window.innerHeight

      const dir = Math.sign(dy)
      if (!dir) return

      const cur = currentRef.current
      const target = targetRef.current
      const total = stepsRef.current.length

      // At bounds: fall through to page scroll without preventDefault
      if (dir < 0 && target <= cur) {
        accRef.current = 0
        return
      }
      if (dir > 0 && target >= total - 1) {
        accRef.current = 0
        return
      }

      // Ring can move in this direction -> prevent page scroll
      e.preventDefault()

      // Reset accumulator if direction flips
      if (Math.sign(accRef.current) !== 0 && Math.sign(accRef.current) !== dir) {
        accRef.current = 0
      }

      // Ignore inertia until the current tween reaches about 70%
      if (activeTweenRef.current && activeTweenRef.current.isActive()) {
        if (activeTweenRef.current.progress() < 0.7) {
          return
        }
      }

      accRef.current += dy

      // Trigger exactly one stage per notch or trackpad flick
      const THRESHOLD = 32
      if (Math.abs(accRef.current) >= THRESHOLD) {
        accRef.current = 0
        const nextStage = Math.max(cur, Math.min(total - 1, target + dir))
        if (nextStage !== target) {
          goToStage(nextStage)
        }
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      if (activeTweenRef.current) activeTweenRef.current.kill()
    }
  }, [goToStage])

  // Keyboard navigation
  const handleKeyDown = (e) => {
    const target = targetRef.current
    const cur = currentRef.current
    const total = stepsRef.current.length

    if (e.key === 'ArrowDown') {
      if (target < total - 1) {
        e.preventDefault()
        goToStage(target + 1)
      }
    } else if (e.key === 'ArrowUp') {
      if (target > cur) {
        e.preventDefault()
        goToStage(target - 1)
      }
    }
  }

  // Node clicks
  const handleNodeClick = (id) => {
    const cur = currentRef.current
    if (id === cur) {
      if (targetRef.current !== cur) {
        goToStage(cur)
      }
      return
    }
    if (id < cur) {
      onSelect(id)
      if (previewStepRef.current !== null) onClearPreview()
      targetRef.current = id
      progressObj.current.value = id
      renderRing(id)
    } else {
      goToStage(id)
    }
  }

  // Hover handlers: coalesce with rAF, never update during tween
  const handleNodeMouseEnter = (id) => {
    if (activeTweenRef.current && activeTweenRef.current.isActive()) return
    if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current)
    hoverRafRef.current = requestAnimationFrame(() => {
      renderRing(id)
    })
  }

  const handleNodeMouseLeave = () => {
    if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current)
    hoverRafRef.current = requestAnimationFrame(() => {
      renderRing(progressObj.current.value)
    })
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

  const initialReadoutId = activeStep
  const initialReadoutStep = steps[initialReadoutId] || steps[0]
  let initialStatus = 'In progress'
  if (initialReadoutId < current || status[initialReadoutId] === 'done') {
    initialStatus = 'Done'
  } else if (initialReadoutId > current) {
    initialStatus = 'Locked'
  }

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
          ref={progressPathRef}
          d={trackPath}
          className="half-dial-progress"
          style={{
            strokeDasharray: totalArcLength,
            strokeDashoffset: RM ? 0 : totalArcLength * (1 - Math.max(0, Math.min(1, activeStep / (steps.length - 1)))),
          }}
        />
      </svg>

      {/* Large Readout inside the half disc */}
      <div className="half-dial-readout" ref={readoutRef} aria-live="polite">
        <div className="half-dial-stage-num m" ref={readoutNumRef}>0{initialReadoutId}</div>
        <div className="half-dial-stage-title" ref={readoutTitleRef}>{initialReadoutStep.title}</div>
        <div
          ref={readoutStatusRef}
          className={`half-dial-stage-status m status-${initialStatus.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <span className="half-dial-status-dot" />
          <span>{initialStatus}</span>
        </div>
      </div>

      {/* 9 Numbered Circular Nodes along the arc */}
      <div className="half-dial-nodes">
        {steps.map((st, i) => {
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
              ref={(el) => (nodeRefs.current[i] = el)}
              type="button"
              className={`half-node-btn ${nodeClass}`}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: `translate3d(-50%, -50%, 0) scale(${st.id === activeStep ? 1.14 : 1})`,
              }}
              onClick={() => handleNodeClick(st.id)}
              onMouseEnter={() => handleNodeMouseEnter(st.id)}
              onMouseLeave={handleNodeMouseLeave}
              onFocus={() => handleNodeMouseEnter(st.id)}
              onBlur={handleNodeMouseLeave}
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
