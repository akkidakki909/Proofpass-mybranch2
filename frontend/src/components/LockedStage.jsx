import { useEffect, useRef, useState } from 'react'
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

// Pre-render offscreen sprites once per theme/size
function bakeSprites(dpr, colors) {
  const { steelHi, steelMid, steelLo, lockBody, lockHole, accent } = colors

  // Helper to create an offscreen canvas
  const makeCanvas = (w, h) => {
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(w * dpr))
    c.height = Math.max(1, Math.round(h * dpr))
    const ctx = c.getContext('2d')
    ctx.scale(dpr, dpr)
    return { canvas: c, ctx, w, h }
  }

  // 1. Soft Shadow Sprite (for chain link contact shadow)
  const shadow = makeCanvas(34, 24)
  {
    const { ctx, w, h } = shadow
    const grad = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, 14)
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.42)')
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.16)')
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(w / 2, h / 2, 14, 8, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // 2. Face-on Link Sprite (19x11 outer, 13x5 inner)
  const faceOn = makeCanvas(26, 18)
  {
    const { ctx, w, h } = faceOn
    const cx = w / 2
    const cy = h / 2

    // Outer rounded rect
    const grad = ctx.createLinearGradient(cx - 10, cy - 6, cx + 10, cy + 6)
    grad.addColorStop(0, steelHi)
    grad.addColorStop(0.45, steelMid)
    grad.addColorStop(1, steelLo)

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(cx - 9.5, cy - 5.5, 19, 11, 4)
    ctx.fill()

    // Punch out inner hole
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.roundRect(cx - 6.5, cy - 2.5, 13, 5, 2.5)
    ctx.fill()
    ctx.restore()

    // Inner rim stroke
    ctx.strokeStyle = steelLo
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.roundRect(cx - 6.5, cy - 2.5, 13, 5, 2.5)
    ctx.stroke()

    // Specular highlight from upper-left light
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)'
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.roundRect(cx - 9, cy - 5, 14, 6, [3, 0, 0, 0])
    ctx.stroke()
  }

  // 3. Edge-on Link Sprite (15x5.6)
  const edgeOn = makeCanvas(22, 12)
  {
    const { ctx, w, h } = edgeOn
    const cx = w / 2
    const cy = h / 2

    const grad = ctx.createLinearGradient(cx, cy - 3, cx, cy + 3)
    grad.addColorStop(0, steelHi)
    grad.addColorStop(0.65, steelMid)
    grad.addColorStop(1, steelLo)

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(cx - 7.5, cy - 2.8, 15, 5.6, 2)
    ctx.fill()

    ctx.strokeStyle = steelLo
    ctx.lineWidth = 0.8
    ctx.stroke()

    // Upper specular highlight line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)'
    ctx.lineWidth = 0.9
    ctx.beginPath()
    ctx.moveTo(cx - 6, cy - 1.8)
    ctx.lineTo(cx + 4, cy - 1.8)
    ctx.stroke()
  }

  // 4. Shackle Sprite (50x44)
  const shackle = makeCanvas(50, 44)
  {
    const { ctx } = shackle
    const grad = ctx.createLinearGradient(10, 8, 40, 36)
    grad.addColorStop(0, steelHi)
    grad.addColorStop(0.5, steelMid)
    grad.addColorStop(1, steelLo)

    ctx.strokeStyle = grad
    ctx.lineWidth = 5.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(13, 34)
    ctx.lineTo(13, 18)
    ctx.arc(25, 18, 12, Math.PI, 0, false)
    ctx.lineTo(37, 34)
    ctx.stroke()

    // Subtle specular sheen on shackle curve
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(25, 18, 13, Math.PI * 1.05, Math.PI * 1.55, false)
    ctx.stroke()
  }

  // 5. Padlock Body Sprite (64x52)
  const padlockBody = makeCanvas(64, 52)
  {
    const { ctx } = padlockBody
    const bx = 5
    const by = 5
    const bw = 54
    const bh = 42

    // Bevelled soft-black body
    ctx.fillStyle = lockBody
    ctx.beginPath()
    ctx.roundRect(bx, by, bw, bh, 6)
    ctx.fill()

    ctx.strokeStyle = steelMid
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Thin orange top line
    ctx.strokeStyle = accent
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(bx + 4, by + 4)
    ctx.lineTo(bx + bw - 4, by + 4)
    ctx.stroke()

    // Keyhole depth
    const kx = bx + bw / 2
    const ky = by + 21
    ctx.fillStyle = lockHole
    ctx.beginPath()
    ctx.arc(kx, ky, 3.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(kx - 2.2, ky + 1.2)
    ctx.lineTo(kx + 2.2, ky + 1.2)
    ctx.lineTo(kx + 1.4, ky + 9)
    ctx.lineTo(kx - 1.4, ky + 9)
    ctx.closePath()
    ctx.fill()

    // Subtle keyhole rim highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.lineWidth = 0.75
    ctx.beginPath()
    ctx.arc(kx, ky, 3.8, 0, Math.PI * 2)
    ctx.stroke()
  }

  // 6. Padlock Soft Drop Shadow
  const padlockShadow = makeCanvas(84, 72)
  {
    const { ctx, w, h } = padlockShadow
    const grad = ctx.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, 38)
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.22)')
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(w / 2, h / 2, 36, 24, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  return {
    shadow: shadow.canvas,
    faceOn: faceOn.canvas,
    edgeOn: edgeOn.canvas,
    shackle: shackle.canvas,
    padlockBody: padlockBody.canvas,
    padlockShadow: padlockShadow.canvas,
  }
}

// Generate nodes along a quadratic bezier with target segment spacing
function createRope(p0, p1, p2, spacing = 18) {
  const points = []
  const N = 80
  let len = 0
  let prev = { x: p0.x, y: p0.y }

  for (let i = 0; i <= N; i++) {
    const t = i / N
    const mt = 1 - t
    const x = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x
    const y = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
    if (i > 0) len += Math.hypot(x - prev.x, y - prev.y)
    points.push({ x, y, dist: len })
    prev = { x, y }
  }

  const count = Math.max(4, Math.round(len / spacing))
  const step = len / count
  const nodes = []

  for (let j = 0; j <= count; j++) {
    const targetDist = j * step
    let pt = points[0]
    for (let k = 1; k < points.length; k++) {
      if (points[k].dist >= targetDist) {
        pt = points[k]
        break
      }
    }
    nodes.push({
      x: pt.x,
      y: pt.y,
      oldX: pt.x,
      oldY: pt.y,
      baseX: pt.x,
      baseY: pt.y,
      isPinned: j === 0 || j === count,
      isFaceOn: j % 2 === 0,
    })
  }

  return { nodes, segmentLength: step }
}

export default function LockedStage({
  stepId,
  currentStep,
  onBack,
  onLookAt,
  rattleTrigger = 0,
}) {
  const cardRef = useRef(null)
  const canvasRef = useRef(null)
  const tagRef = useRef(null)

  const [dims, setDims] = useState({ w: 800, h: 560 })
  const [isCardOnScreen, setIsCardOnScreen] = useState(true)

  // Simulation state held in refs (zero React re-renders in physics/drawing loop)
  const simRef = useRef({
    chains: [],
    lock: {
      x: 400,
      y: 280,
      oldX: 400,
      oldY: 280,
      angle: 0,
      angularVelocity: 0,
      dropOffset: 0,
    },
    entrance: {
      slide1: -110,
      slide2: 110,
      slide3: -90,
      lockDrop: -65,
      sag: 0.15,
    },
    entranceDone: false,
    sprites: null,
    dpr: 1,
    w: 800,
    h: 560,
    mouse: { x: -2000, y: -2000, active: false },
    cardRect: null,
    isSleeping: false,
    isOffscreen: false,
    isDocumentHidden: false,
    time: 0,
    accumulator: 0,
  })

  // Wake the loop from sleep
  const wakeUp = () => {
    const s = simRef.current
    if (s.isSleeping) {
      s.isSleeping = false
      s.accumulator = 0
    }
  }

  // Read theme colors from CSS variables
  const getThemeColors = () => {
    if (typeof window === 'undefined') {
      return {
        steelHi: '#e8ebed',
        steelMid: '#9ea8b0',
        steelLo: '#525a62',
        lockBody: '#1d1a17',
        lockHole: '#0e0d0b',
        accent: '#ea580c',
      }
    }
    const cs = window.getComputedStyle(document.documentElement)
    return {
      steelHi: cs.getPropertyValue('--steel-hi').trim() || '#e8ebed',
      steelMid: cs.getPropertyValue('--steel-mid').trim() || '#9ea8b0',
      steelLo: cs.getPropertyValue('--steel-lo').trim() || '#525a62',
      lockBody: cs.getPropertyValue('--lock-body').trim() || '#1d1a17',
      lockHole: cs.getPropertyValue('--lock-hole').trim() || '#0e0d0b',
      accent: cs.getPropertyValue('--accent').trim() || '#ea580c',
    }
  }

  // Measure card with ResizeObserver (reallocate canvas buffer only when size really changes)
  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          const w = Math.round(width)
          const h = Math.round(height)
          setDims((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
        }
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Cache card rect on resize and scroll only
  useEffect(() => {
    const updateCardRect = () => {
      if (cardRef.current) {
        simRef.current.cardRect = cardRef.current.getBoundingClientRect()
      }
    }
    updateCardRect()
    window.addEventListener('resize', updateCardRect, { passive: true })
    window.addEventListener('scroll', updateCardRect, { passive: true })
    return () => {
      window.removeEventListener('resize', updateCardRect)
      window.removeEventListener('scroll', updateCardRect)
    }
  }, [])

  // Coalesced pointer move over card
  useEffect(() => {
    let pendingEvt = null
    const onPointerMove = (e) => {
      pendingEvt = e
      wakeUp()
    }
    const onPointerLeave = () => {
      simRef.current.mouse.active = false
      simRef.current.mouse.x = -2000
      simRef.current.mouse.y = -2000
      pendingEvt = null
      wakeUp()
    }

    const card = cardRef.current
    if (!card) return

    const processPointer = () => {
      if (pendingEvt && simRef.current.cardRect) {
        simRef.current.mouse.x = pendingEvt.clientX - simRef.current.cardRect.left
        simRef.current.mouse.y = pendingEvt.clientY - simRef.current.cardRect.top
        simRef.current.mouse.active = true
        pendingEvt = null
      }
    }

    card.addEventListener('pointermove', onPointerMove, { passive: true })
    card.addEventListener('pointerleave', onPointerLeave, { passive: true })

    // Store processor on simRef for frame ticker
    simRef.current.processPointer = processPointer

    return () => {
      card.removeEventListener('pointermove', onPointerMove)
      card.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [])

  // Card click impulse: rattle chains and swing lock
  const handleCardClick = () => {
    wakeUp()
    const s = simRef.current
    s.chains.forEach((chain) => {
      chain.nodes.forEach((n) => {
        if (!n.isPinned) {
          n.oldY += (Math.random() - 0.5) * 14
          n.oldX += (Math.random() - 0.5) * 8
        }
      })
    })
    s.lock.angularVelocity += (Math.random() > 0.5 ? 1 : -1) * 0.32
  }

  // Replay rattle when clicking another locked node
  useEffect(() => {
    if (rattleTrigger === 0) return
    handleCardClick()
  }, [rattleTrigger])

  // Setup chains, canvas, GSAP entrance, and gsap.ticker loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { w, h } = dims
    const cx = w / 2
    const cy = h / 2 + 36
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    // Sized with capped dpr
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const colors = getThemeColors()
    const sprites = bakeSprites(dpr, colors)

    // Build the 3 verlet chains
    // Chain 1: Top-Left to Bottom-Right through center
    const c1 = createRope(
      { x: -14, y: h * 0.12 },
      { x: cx, y: cy },
      { x: w + 14, y: h * 0.88 },
      18
    )
    // Chain 2: Top-Right to Bottom-Left through center
    const c2 = createRope(
      { x: w + 14, y: h * 0.12 },
      { x: cx, y: cy },
      { x: -14, y: h * 0.88 },
      18
    )
    // Chain 3: Lower horizontal run
    const c3 = createRope(
      { x: -14, y: h * 0.65 },
      { x: cx, y: cy + 45 },
      { x: w + 14, y: h * 0.65 },
      18
    )

    const s = simRef.current
    s.chains = [c1, c2, c3]
    s.sprites = sprites
    s.dpr = dpr
    s.w = w
    s.h = h
    s.lock.x = cx
    s.lock.y = cy
    s.lock.oldX = cx
    s.lock.oldY = cy
    s.lock.angle = 0
    s.lock.angularVelocity = 0
    s.entranceDone = false
    s.isSleeping = false

    // Single static render for reduced motion
    if (RM) {
      drawFrame(ctx, s, dpr, w, h)
      if (tagRef.current) {
        tagRef.current.style.transform = `translate3d(-50%, -50%, 0) translate3d(${cx}px, ${cy + 12}px, 0)`
      }
      return
    }

    // GSAP physics parameter animation for entrance
    s.entrance = {
      slide1: -110,
      slide2: 110,
      slide3: -90,
      lockDrop: -65,
      sag: 0.15,
    }

    const entranceTween = gsap.to(s.entrance, {
      slide1: 0,
      slide2: 0,
      slide3: 0,
      lockDrop: 0,
      sag: 1,
      duration: 1.4,
      ease: 'power3.out',
      onComplete: () => {
        s.entranceDone = true
      },
    })

    // Lock drop bounce
    const lockDropTween = gsap.fromTo(
      s.lock,
      { dropOffset: -60, angle: -0.22 },
      { dropOffset: 0, angle: 0, duration: 1.25, ease: 'bounce.out', delay: 0.08 }
    )

    // Fixed timestep verlet stepper
    const FIXED_DT = 1 / 60
    const GRAVITY = 320
    const CONSTRAINT_ITERS = 7

    const stepPhysics = (dt) => {
      s.time += dt
      const { chains, lock, mouse, entrance } = s

      // Update pinned endpoints with entrance slide
      if (chains[0]?.nodes) {
        chains[0].nodes[0].x = chains[0].nodes[0].baseX + entrance.slide1
        chains[0].nodes[chains[0].nodes.length - 1].x =
          chains[0].nodes[chains[0].nodes.length - 1].baseX + entrance.slide1
      }
      if (chains[1]?.nodes) {
        chains[1].nodes[0].x = chains[1].nodes[0].baseX + entrance.slide2
        chains[1].nodes[chains[1].nodes.length - 1].x =
          chains[1].nodes[chains[1].nodes.length - 1].baseX + entrance.slide2
      }
      if (chains[2]?.nodes) {
        chains[2].nodes[0].x = chains[2].nodes[0].baseX + entrance.slide3
        chains[2].nodes[chains[2].nodes.length - 1].x =
          chains[2].nodes[chains[2].nodes.length - 1].baseX + entrance.slide3
      }

      // Idle sway force
      const idleSway = 0.05 * Math.sin(s.time * 1.8)

      // 1. Verlet integrate nodes
      chains.forEach((ch, chIdx) => {
        ch.nodes.forEach((n, i) => {
          if (n.isPinned) return

          const vx = (n.x - n.oldX) * 0.982
          const vy = (n.y - n.oldY) * 0.982
          n.oldX = n.x
          n.oldY = n.y

          n.x += vx + idleSway * (chIdx % 2 === 0 ? 1 : -1)
          n.y += vy + GRAVITY * entrance.sag * dt * dt

          // Cursor pushes nearby nodes (radius ~70px)
          if (mouse.active) {
            const dx = n.x - mouse.x
            const dy = n.y - mouse.y
            const dist = Math.hypot(dx, dy)
            const RADIUS = 70
            if (dist < RADIUS && dist > 0.001) {
              const force = (1 - dist / RADIUS) * 2.8
              n.x += (dx / dist) * force
              n.y += (dy / dist) * force
            }
          }
        })

        // 2. Constraint relaxation iterations
        for (let iter = 0; iter < CONSTRAINT_ITERS; iter++) {
          for (let i = 0; i < ch.nodes.length - 1; i++) {
            const n1 = ch.nodes[i]
            const n2 = ch.nodes[i + 1]
            const dx = n2.x - n1.x
            const dy = n2.y - n1.y
            const dist = Math.hypot(dx, dy)
            if (dist < 0.0001) continue
            const diff = (dist - ch.segmentLength) / dist

            if (!n1.isPinned && !n2.isPinned) {
              n1.x += dx * 0.5 * diff
              n1.y += dy * 0.5 * diff
              n2.x -= dx * 0.5 * diff
              n2.y -= dy * 0.5 * diff
            } else if (!n1.isPinned) {
              n1.x += dx * diff
              n1.y += dy * diff
            } else if (!n2.isPinned) {
              n2.x -= dx * diff
              n2.y -= dy * diff
            }
          }
        }
      })

      // 3. Padlock pendulum hanging from chain intersection
      if (chains[0] && chains[1]) {
        const m1 = chains[0].nodes[Math.floor(chains[0].nodes.length / 2)]
        const m2 = chains[1].nodes[Math.floor(chains[1].nodes.length / 2)]
        const anchorX = (m1.x + m2.x) / 2
        const anchorY = (m1.y + m2.y) / 2

        // Damped pendulum
        const pendulumGravity = 28
        const damping = 0.965
        const angularAcc = -Math.sin(lock.angle) * pendulumGravity * dt
        lock.angularVelocity = (lock.angularVelocity + angularAcc) * damping
        lock.angle += lock.angularVelocity * dt

        lock.x = anchorX + Math.sin(lock.angle) * 16
        lock.y = anchorY + Math.cos(lock.angle) * 16 + (lock.dropOffset || 0)
      }
    }

    // Check kinetic energy to settle and sleep
    const checkEnergy = () => {
      let energy = Math.abs(s.lock.angularVelocity)
      for (const ch of s.chains) {
        for (const n of ch.nodes) {
          if (!n.isPinned) {
            energy += Math.abs(n.x - n.oldX) + Math.abs(n.y - n.oldY)
          }
        }
      }
      return energy
    }

    let lastTime = performance.now()

    // Shared loop on gsap.ticker
    const tick = (time, deltaTime) => {
      if (s.isSleeping || s.isOffscreen || s.isDocumentHidden) return

      if (s.processPointer) s.processPointer()

      // Clamp deltaTime to avoid huge jumps after tab freeze
      const dt = Math.min(deltaTime / 1000, 0.05)
      s.accumulator += dt

      while (s.accumulator >= FIXED_DT) {
        stepPhysics(FIXED_DT)
        s.accumulator -= FIXED_DT
      }

      // Draw frame on canvas
      drawFrame(ctx, s, dpr, w, h)

      // If settled and entrance done, sleep to save CPU
      if (s.entranceDone && !s.mouse.active) {
        const totalEnergy = checkEnergy()
        if (totalEnergy < 0.008) {
          s.isSleeping = true
        }
      }
    }

    gsap.ticker.add(tick)

    // Pause loop when document is hidden or card is offscreen
    const onVisibilityChange = () => {
      s.isDocumentHidden = document.hidden
      if (!s.isDocumentHidden) wakeUp()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        s.isOffscreen = !entry.isIntersecting
        setIsCardOnScreen(entry.isIntersecting)
        if (!s.isOffscreen) wakeUp()
      }
    })
    io.observe(cardRef.current)

    // Theme change observer to re-bake sprites
    const themeObserver = new MutationObserver(() => {
      const newColors = getThemeColors()
      s.sprites = bakeSprites(dpr, newColors)
      wakeUp()
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => {
      gsap.ticker.remove(tick)
      entranceTween.kill()
      lockDropTween.kill()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      io.disconnect()
      themeObserver.disconnect()
    }
  }, [dims, stepId, RM])

  // Single frame draw using ONLY pre-baked offscreen canvas sprites and drawImage
  const drawFrame = (ctx, s, dpr, w, h) => {
    const { sprites, chains, lock } = s
    if (!sprites) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    // 1. Draw contact shadows under each chain
    for (let c = 0; c < chains.length; c++) {
      const nodes = chains[c].nodes
      for (let i = 0; i < nodes.length - 1; i++) {
        const n1 = nodes[i]
        const n2 = nodes[i + 1]
        const mx = (n1.x + n2.x) / 2
        const my = (n1.y + n2.y) / 2 + 5
        const angle = Math.atan2(n2.y - n1.y, n2.x - n1.x)

        ctx.save()
        ctx.translate(mx, my)
        ctx.rotate(angle)
        ctx.drawImage(sprites.shadow, -17, -12, 34, 24)
        ctx.restore()
      }
    }

    // Darker ambient contact shadow where chains cross
    const cx = w / 2
    const cy = h / 2 + 36
    ctx.save()
    ctx.drawImage(sprites.shadow, cx - 34, cy - 14, 68, 48)
    ctx.restore()

    // 2. Draw chain links with pre-baked sprites (drawImage with setTransform)
    for (let c = 0; c < chains.length; c++) {
      const nodes = chains[c].nodes
      for (let i = 0; i < nodes.length - 1; i++) {
        const n1 = nodes[i]
        const n2 = nodes[i + 1]
        const mx = (n1.x + n2.x) / 2
        const my = (n1.y + n2.y) / 2
        const angle = Math.atan2(n2.y - n1.y, n2.x - n1.x)
        const isFaceOn = i % 2 === 0

        // Subtle rotation & scale variation
        const rotVariation = Math.sin(i * 12.3) * 0.05
        const sprite = isFaceOn ? sprites.faceOn : sprites.edgeOn
        const sw = isFaceOn ? 26 : 22
        const sh = isFaceOn ? 18 : 12

        ctx.save()
        ctx.translate(mx, my)
        ctx.rotate(angle + rotVariation)
        ctx.drawImage(sprite, -sw / 2, -sh / 2, sw, sh)
        ctx.restore()
      }
    }

    // 3. Draw Padlock Drop Shadow
    ctx.save()
    ctx.translate(lock.x, lock.y + 12)
    ctx.drawImage(sprites.padlockShadow, -42, -36, 84, 72)
    ctx.restore()

    // 4. Draw Padlock Shackle
    ctx.save()
    ctx.translate(lock.x, lock.y - 12)
    ctx.rotate(lock.angle)
    ctx.drawImage(sprites.shackle, -25, -22, 50, 44)
    ctx.restore()

    // 5. Draw Padlock Body
    ctx.save()
    ctx.translate(lock.x, lock.y + 10)
    ctx.rotate(lock.angle)
    ctx.drawImage(sprites.padlockBody, -32, -26, 64, 52)
    ctx.restore()
  }

  const stepDef = STEP_DEFINITIONS[stepId] || { title: 'Pipeline Stage' }
  const prevStep = Math.max(0, stepId - 1)
  const prevTitle = STEP_DEFINITIONS[prevStep]?.title || `Step 0${prevStep}`
  const currentStepTitle = STEP_DEFINITIONS[currentStep]?.title || `Step 0${currentStep}`
  const isFar = stepId > currentStep + 1
  const cx = dims.w / 2
  const cy = dims.h / 2 + 36

  return (
    <div
      className="step-card glass locked-stage-card"
      ref={cardRef}
      onClick={handleCardClick}
      style={{ contain: 'layout paint' }}
    >
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

      {/* Single 2D Canvas for all Chains & Padlock (Pointer-events none) */}
      <canvas
        ref={canvasRef}
        className="locked-chains-canvas"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 15,
        }}
        aria-hidden="true"
      />

      {/* Decorative ring link on card under padlock */}
      <div
        className="hanging-tag-ring"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: `${cx}px`,
          top: `${cy + 22}px`,
          transform: 'translate(-50%, -50%)',
          zIndex: 16,
        }}
      />

      {/* Top Message Tag inside the Card (Change 1) */}
      <div
        className={`locked-stage-tag-wrap ${isCardOnScreen ? 'visible' : 'hidden'}`}
        aria-hidden={!isCardOnScreen}
      >
        <div
          className="locked-hanging-tag"
          role="status"
          aria-live="polite"
        >
          <p className="tag-msg">
            {isFar
              ? `Complete the earlier stages first. Complete Step 0${prevStep}, ${prevTitle}, to unlock this stage.`
              : `Complete Step 0${prevStep}, ${prevTitle}, to unlock this stage.`}
          </p>
          <div className="tag-btn-row">
            <button
              type="button"
              className="b sm"
              onClick={(e) => {
                e.stopPropagation()
                onBack()
              }}
            >
              Complete Step 0{currentStep}: {currentStepTitle}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
