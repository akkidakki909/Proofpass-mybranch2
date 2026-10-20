import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { RM } from '../lib.js'

export default function VerifyBackground({ currentStep = 0 }) {
  const canvasRef = useRef(null)
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr) return attr === 'dark'
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Watch data-theme with a MutationObserver so the effect switches the moment the theme toggles
  useEffect(() => {
    const checkTheme = () => {
      const attr = document.documentElement.getAttribute('data-theme')
      if (attr) {
        setIsDark(attr === 'dark')
      } else {
        setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
      }
    }

    checkTheme()

    const observer = new MutationObserver(() => {
      checkTheme()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onMql = (e) => {
      if (!document.documentElement.getAttribute('data-theme')) {
        setIsDark(e.matches)
      }
    }
    mql.addEventListener('change', onMql)

    return () => {
      observer.disconnect()
      mql.removeEventListener('change', onMql)
    }
  }, [])

  // Particle canvas simulation on gsap.ticker
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let paused = false

    // Mouse coordinates (scaled to CSS pixels)
    const mouse = { x: -2000, y: -2000, active: false }

    const onPointerMove = (e) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.active = true
    }
    const onPointerLeave = () => {
      mouse.active = false
      mouse.x = -2000
      mouse.y = -2000
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave, { passive: true })

    // DPR capped at 1.5
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let width = window.innerWidth
    let height = window.innerHeight

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // Pre-render a glow sprite once on an offscreen canvas
    const glowSprite = document.createElement('canvas')
    const glowSize = 32
    glowSprite.width = Math.round(glowSize * dpr)
    glowSprite.height = Math.round(glowSize * dpr)
    const gCtx = glowSprite.getContext('2d')
    gCtx.scale(dpr, dpr)
    const gGrad = gCtx.createRadialGradient(glowSize / 2, glowSize / 2, 1, glowSize / 2, glowSize / 2, glowSize / 2)
    if (isDark) {
      gGrad.addColorStop(0, 'rgba(232, 128, 63, 0.85)')
      gGrad.addColorStop(0.3, 'rgba(232, 128, 63, 0.4)')
      gGrad.addColorStop(1, 'rgba(232, 128, 63, 0)')
    } else {
      gGrad.addColorStop(0, 'rgba(165, 105, 45, 0.75)')
      gGrad.addColorStop(0.3, 'rgba(232, 160, 90, 0.25)')
      gGrad.addColorStop(1, 'rgba(232, 160, 90, 0)')
    }
    gCtx.fillStyle = gGrad
    gCtx.beginPath()
    gCtx.arc(glowSize / 2, glowSize / 2, glowSize / 2, 0, Math.PI * 2)
    gCtx.fill()

    // Setup particles
    const PARTICLE_COUNT = 65
    const particles = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: isDark ? -(0.35 + Math.random() * 0.6) : (Math.random() - 0.4) * 0.4,
        baseVy: isDark ? -(0.35 + Math.random() * 0.6) : (Math.random() - 0.4) * 0.4,
        r: 1.4 + Math.random() * 2.2,
        alpha: 0.25 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
      })
    }

    // Single static frame when reduced motion is on
    if (RM) {
      ctx.clearRect(0, 0, width, height)
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = isDark
          ? `rgba(232, 128, 63, ${p.alpha * 0.6})`
          : `rgba(165, 105, 45, ${p.alpha * 0.5})`
        ctx.fill()
      }
      return () => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerleave', onPointerLeave)
        window.removeEventListener('resize', resize)
      }
    }

    // Visibility change: pause when tab is hidden
    const onVisibilityChange = () => {
      paused = document.hidden
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    // Spatial grid configuration for near-neighbor lines
    const CELL_SIZE = 80
    const maxConnectDist = 78

    const tick = (time, deltaTime) => {
      if (paused) return

      // Delta time clamp (in 60fps unit factor)
      const dtFactor = Math.min(deltaTime / (1000 / 60), 2.5)

      ctx.clearRect(0, 0, width, height)

      // Spatial hash grid for fast neighbor lookup
      const cols = Math.ceil(width / CELL_SIZE) + 1
      const rows = Math.ceil(height / CELL_SIZE) + 1
      const grid = new Map()

      // 1. Update particles and cursor repulsion
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        p.phase += 0.02 * dtFactor
        if (isDark) {
          // Drifting up embers
          p.x += (Math.sin(p.phase) * 0.28 + p.vx) * dtFactor
          p.y += p.vy * dtFactor
          if (p.y < -12) {
            p.y = height + 10
            p.x = Math.random() * width
          }
          if (p.x < -12) p.x = width + 10
          if (p.x > width + 12) p.x = -10
        } else {
          // Dust motes in sunlight shaft
          p.x += (Math.sin(p.phase) * 0.22 + p.vx) * dtFactor
          p.y += (Math.cos(p.phase * 0.8) * 0.18 + p.vy) * dtFactor
          if (p.y < -12) p.y = height + 10
          if (p.y > height + 12) p.y = -10
          if (p.x < -12) p.x = width + 10
          if (p.x > width + 12) p.x = -10
        }

        // Cursor gently pushes particles away
        if (mouse.active) {
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const dist = Math.hypot(dx, dy)
          const repelRadius = 110

          if (dist > 0.001 && dist < repelRadius) {
            const force = (1 - dist / repelRadius) * 1.8 * dtFactor
            p.x += (dx / dist) * force
            p.y += (dy / dist) * force

            // Draw thin accent lines to particles near cursor
            const lineAlpha = (1 - dist / repelRadius) * (isDark ? 0.45 : 0.35)
            ctx.strokeStyle = isDark
              ? `rgba(232, 128, 63, ${lineAlpha})`
              : `rgba(181, 70, 16, ${lineAlpha})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(mouse.x, mouse.y)
            ctx.lineTo(p.x, p.y)
            ctx.stroke()
          }
        }

        // Insert into spatial grid
        const c = Math.floor(p.x / CELL_SIZE)
        const r = Math.floor(p.y / CELL_SIZE)
        const key = `${c},${r}`
        if (!grid.has(key)) grid.set(key, [])
        grid.get(key).push(p)

        // Draw particle using fast pre-rendered glow sprite
        const drawR = p.r * 2.8
        ctx.globalAlpha = p.alpha
        ctx.drawImage(glowSprite, p.x - drawR, p.y - drawR, drawR * 2, drawR * 2)
      }
      ctx.globalAlpha = 1

      // 2. Near-neighbour connections via spatial grid
      for (const [key, cellParticles] of grid.entries()) {
        const [cxStr, cyStr] = key.split(',')
        const cellX = parseInt(cxStr, 10)
        const cellY = parseInt(cyStr, 10)

        // Check self and neighboring 4 cells (right, bottom-left, bottom, bottom-right)
        const neighborKeys = [
          key,
          `${cellX + 1},${cellY}`,
          `${cellX - 1},${cellY + 1}`,
          `${cellX},${cellY + 1}`,
          `${cellX + 1},${cellY + 1}`,
        ]

        for (let i = 0; i < cellParticles.length; i++) {
          const p1 = cellParticles[i]

          for (const nKey of neighborKeys) {
            const nList = grid.get(nKey)
            if (!nList) continue

            const startJ = nKey === key ? i + 1 : 0
            for (let j = startJ; j < nList.length; j++) {
              const p2 = nList[j]
              const dx = p1.x - p2.x
              const dy = p1.y - p2.y
              const dist = Math.hypot(dx, dy)

              if (dist < maxConnectDist) {
                const lineAlpha = (1 - dist / maxConnectDist) * (isDark ? 0.22 : 0.12)
                ctx.strokeStyle = isDark
                  ? `rgba(232, 128, 63, ${lineAlpha})`
                  : `rgba(29, 26, 23, ${lineAlpha})`
                ctx.lineWidth = 0.85
                ctx.beginPath()
                ctx.moveTo(p1.x, p1.y)
                ctx.lineTo(p2.x, p2.y)
                ctx.stroke()
              }
            }
          }
        }
      }
    }

    gsap.ticker.add(tick)

    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [isDark])

  const stepProgress = Math.max(0, Math.min(1, currentStep / 8))

  return (
    <div
      className="verify-background"
      style={{ '--step-progress': stepProgress }}
      aria-hidden="true"
    >
      {/* a) Soft colour blobs with radial gradient falloff drifting slowly */}
      <div className="vb-blobs">
        <div className="vb-blob vb-blob-1" />
        <div className="vb-blob vb-blob-2" />
        <div className="vb-blob vb-blob-3" />
      </div>

      {/* Slanted shaft of sunlight (moves horizontally with step/8) */}
      <div className="vb-sunlight-shaft" />

      {/* b) Dot grid visible inside a radius around the cursor */}
      <div className="vb-dot-grid" />

      {/* c) Canvas of particles that changes with theme */}
      <canvas ref={canvasRef} className="vb-particle-canvas" />
    </div>
  )
}
