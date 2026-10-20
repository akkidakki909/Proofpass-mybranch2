import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { RM, scroller } from '../lib.js'

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

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
  const stateRef = useRef({
    displayed: activeStep,
    target: activeStep,
    lastCommittedStage: activeStep,
    isMoving: false,
    snapTween: null,
  })
  const snapTimeoutRef = useRef(null)

  // Track props in refs for closures and ticker loop
  const currentRef = useRef(current)
  currentRef.current = current
  const previewStepRef = useRef(previewStep)
  previewStepRef.current = previewStep
  const statusRef = useRef(status)
  statusRef.current = status
  const stepsRef = useRef(steps)
  stepsRef.current = steps
  const isMobileRef = useRef(isMobile)
  isMobileRef.current = isMobile

  // Ring geometry cache for capture-phase hit-testing
  const ringGeoRef = useRef({
    active: false,
    centerX: 0,
    centerY: 0,
    radius: 0,
    width: 0,
    hintTop: 0,
    hintBottom: 0,
    hintRight: 0,
  })

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

  // Scroll main stage back to top and focus step heading without scrolling (Fix 2c)
  const scrollToStageTop = useCallback(() => {
    if (scroller.lenis) {
      scroller.lenis.scrollTo(0, {
        duration: RM ? 0 : 0.45,
        easing: easeOutCubic,
        force: true,
        immediate: RM,
      })
    } else {
      window.scrollTo({
        top: 0,
        behavior: RM ? 'auto' : 'smooth',
      })
    }

    // Reset scroll position of inner containers inside the card (wide tables)
    const innerContainers = document.querySelectorAll(
      '.table-card, .table-wrap, .inner-scroll, .data-table-wrapper, .verify-step-card [style*="overflow"]'
    )
    innerContainers.forEach((el) => {
      el.scrollLeft = 0
      el.scrollTop = 0
    })

    // Keep step heading as focus target without scrolling
    const heading = document.querySelector(
      '.verify-step-heading, .verify-step-title, h2.step-title, [data-step-heading], .stage-heading'
    )
    if (heading) {
      if (!heading.hasAttribute('tabindex')) {
        heading.setAttribute('tabindex', '-1')
      }
      heading.focus({ preventScroll: true })
    }
  }, [])

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

    // 3. Node transforms and classes (transform and opacity only)
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

  // Toggle will-change and moving CSS class only while active
  const setMoving = useCallback((moving) => {
    if (stateRef.current.isMoving === moving) return
    stateRef.current.isMoving = moving

    if (dialRef.current) {
      dialRef.current.classList.toggle('is-moving', moving)
    }

    const movingEls = [
      progressPathRef.current,
      readoutRef.current,
      ...nodeRefs.current.filter(Boolean),
    ]
    movingEls.forEach((el) => {
      if (el) el.style.willChange = moving ? 'transform, opacity' : 'auto'
    })
  }, [])

  // Snap target to nearest stage with short ease
  const snapToNearest = useCallback(() => {
    const min = currentRef.current
    const max = stepsRef.current.length - 1
    const nearest = Math.max(min, Math.min(max, Math.round(stateRef.current.target)))

    if (RM) {
      stateRef.current.target = nearest
      stateRef.current.displayed = nearest
      setMoving(false)
      renderRing(nearest)
      return
    }

    stateRef.current.snapTween = gsap.to(stateRef.current, {
      target: nearest,
      duration: 0.35,
      ease: 'power3.out',
      onComplete: () => {
        stateRef.current.snapTween = null
        if (Math.abs(stateRef.current.target - stateRef.current.displayed) < 0.005) {
          stateRef.current.displayed = nearest
          setMoving(false)
        }
      },
    })
  }, [RM, renderRing, setMoving])

  // Single animation loop (gsap.ticker) easing displayed toward target
  useEffect(() => {
    if (typeof window === 'undefined') return

    const onTick = (time, deltaTime) => {
      const state = stateRef.current
      const cur = currentRef.current
      const total = stepsRef.current.length

      // If fully settled and idle, do no work
      if (
        Math.abs(state.target - state.displayed) < 0.001 &&
        !state.isMoving &&
        !state.snapTween &&
        !snapTimeoutRef.current
      ) {
        return
      }

      const dt = Math.min(0.1, (deltaTime || 16.6) / 1000)

      if (RM) {
        state.displayed = state.target
        setMoving(false)
      } else {
        // Exponential smoothing: time-based factor identical at 60, 120, 144Hz
        const factor = 1 - Math.exp(-18 * dt)
        state.displayed += (state.target - state.displayed) * factor

        if (
          Math.abs(state.target - state.displayed) < 0.002 &&
          !state.snapTween &&
          !snapTimeoutRef.current
        ) {
          state.displayed = state.target
          setMoving(false)
        }
      }

      // Write directly to DOM elements
      renderRing(state.displayed)

      // Halfway point check to update React state
      const focusedStage = Math.max(cur, Math.min(total - 1, Math.round(state.displayed)))
      if (focusedStage !== state.lastCommittedStage) {
        state.lastCommittedStage = focusedStage
        if (focusedStage === cur) {
          onClearPreview()
        } else {
          onPreview(focusedStage)
        }
        scrollToStageTop()
      }
    }

    gsap.ticker.add(onTick)
    return () => {
      gsap.ticker.remove(onTick)
    }
  }, [renderRing, onClearPreview, onPreview, scrollToStageTop, setMoving])

  // Responsive radius & geometry cache
  useEffect(() => {
    const onResize = () => {
      const h = window.innerHeight
      const w = window.innerWidth
      const r = Math.min(250, Math.max(150, Math.round(h * 0.25)))
      setRadius(r)
      const mobile = w < 900
      setIsMobile(mobile)
      isMobileRef.current = mobile
      document.documentElement.style.setProperty('--dial-width', `${r + 56}px`)

      if (mobile) {
        ringGeoRef.current.active = false
      } else {
        const centerY = h / 2
        const pad = 46
        const dialW = r + 56
        const dialBottom = centerY + (r + 28)
        ringGeoRef.current = {
          active: true,
          centerX: 0,
          centerY,
          radius: r + pad,
          width: dialW,
          hintTop: dialBottom - 10,
          hintBottom: dialBottom + 50,
          hintRight: 240,
        }
      }
    }

    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Sync external current/previewStep changes
  useEffect(() => {
    const desired = previewStep !== null ? previewStep : current
    if (Math.abs(stateRef.current.displayed - desired) > 0.01) {
      stateRef.current.target = desired
      stateRef.current.displayed = desired
      stateRef.current.lastCommittedStage = desired
      renderRing(desired)
    }
  }, [current, previewStep, renderRing])

  // Wheel handling logic with resistance near ends
  const handleWheelDelta = useCallback((dy) => {
    const min = currentRef.current
    const max = stepsRef.current.length - 1
    const TRAVEL_PER_STAGE = 110

    if (stateRef.current.snapTween) {
      stateRef.current.snapTween.kill()
      stateRef.current.snapTween = null
    }

    let delta = dy / TRAVEL_PER_STAGE
    const currentTarget = stateRef.current.target

    // Resistance near ends
    if (currentTarget < min && delta < 0) {
      delta *= 0.15
    } else if (currentTarget > max && delta > 0) {
      delta *= 0.15
    }

    let nextTarget = currentTarget + delta
    // Elastic bounds clamp
    nextTarget = Math.max(min - 0.25, Math.min(max + 0.25, nextTarget))
    stateRef.current.target = nextTarget

    setMoving(true)

    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current)
    snapTimeoutRef.current = setTimeout(() => {
      snapToNearest()
    }, 140)
  }, [setMoving, snapToNearest])

  // Window-level capture-phase wheel listener: ring owns the wheel completely (Fix 2a)
  useEffect(() => {
    const isInsideRing = (clientX, clientY) => {
      const geo = ringGeoRef.current
      if (!geo.active) return false
      if (clientX < 0) return false

      // 1. Half-disc hit test
      const dx = clientX
      const dy = clientY - geo.centerY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (clientX <= geo.width && dist <= geo.radius) {
        return true
      }

      // 2. Hint text area under the dial
      if (clientX <= geo.hintRight && clientY >= geo.hintTop && clientY <= geo.hintBottom) {
        return true
      }

      return false
    }

    const onWindowWheelCapture = (e) => {
      if (isMobileRef.current) return
      if (!isInsideRing(e.clientX, e.clientY)) return

      // Pointer is over ring region: prevent page scroll and own wheel completely
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()

      if (e.ctrlKey) return

      let dy = e.deltaY
      if (e.deltaMode === 1) dy *= 16
      else if (e.deltaMode === 2) dy *= window.innerHeight

      handleWheelDelta(dy)
    }

    window.addEventListener('wheel', onWindowWheelCapture, { passive: false, capture: true })
    return () => {
      window.removeEventListener('wheel', onWindowWheelCapture, { capture: true })
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current)
      if (stateRef.current.snapTween) stateRef.current.snapTween.kill()
    }
  }, [handleWheelDelta])

  // Keyboard navigation using same target and easing
  const handleKeyDown = (e) => {
    const cur = currentRef.current
    const total = stepsRef.current.length
    const currentTarget = Math.round(stateRef.current.target)

    if (e.key === 'ArrowDown') {
      if (currentTarget < total - 1) {
        e.preventDefault()
        stateRef.current.target = currentTarget + 1
        setMoving(true)
        if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current)
        snapTimeoutRef.current = setTimeout(() => {
          snapToNearest()
        }, 140)
      }
    } else if (e.key === 'ArrowUp') {
      if (currentTarget > cur) {
        e.preventDefault()
        stateRef.current.target = currentTarget - 1
        setMoving(true)
        if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current)
        snapTimeoutRef.current = setTimeout(() => {
          snapToNearest()
        }, 140)
      }
    }
  }

  // Node clicks using same target and easing
  const handleNodeClick = (id) => {
    const cur = currentRef.current
    if (id === cur) {
      if (Math.round(stateRef.current.target) !== cur) {
        stateRef.current.target = cur
        setMoving(true)
        if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current)
        snapTimeoutRef.current = setTimeout(() => {
          snapToNearest()
        }, 140)
      }
      return
    }
    if (id < cur) {
      onSelect(id)
      if (previewStepRef.current !== null) onClearPreview()
      stateRef.current.target = id
      stateRef.current.displayed = id
      stateRef.current.lastCommittedStage = id
      setMoving(false)
      scrollToStageTop()
      renderRing(id)
    } else {
      stateRef.current.target = id
      setMoving(true)
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current)
      snapTimeoutRef.current = setTimeout(() => {
        snapToNearest()
      }, 140)
    }
  }

  // Hover handlers: single coalesced write when idle, never while moving
  const handleNodeMouseEnter = (id) => {
    if (stateRef.current.isMoving) return
    renderRing(id)
  }

  const handleNodeMouseLeave = () => {
    if (stateRef.current.isMoving) return
    renderRing(stateRef.current.displayed)
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
      data-lenis-prevent
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

      {/* Numbered Circular Nodes along the arc */}
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
