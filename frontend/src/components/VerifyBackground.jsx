import { useEffect, useRef, useState } from 'react'
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

  // Particle canvas simulation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId = null
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

    // DPR capped at 2
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let width = window.innerWidth
    let height = window.innerHeight

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
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

    // Setup particles
    const PARTICLE_COUNT = 70
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
      if (!paused) {
        animId = requestAnimationFrame(loop)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const loop = () => {
      if (paused) return

      ctx.clearRect(0, 0, width, height)

      // 1. Update particles and cursor repulsion
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        p.phase += 0.02
        if (isDark) {
          // Drifting up embers
          p.x += Math.sin(p.phase) * 0.28 + p.vx
          p.y += p.vy
          if (p.y < -12) {
            p.y = height + 10
            p.x = Math.random() * width
          }
          if (p.x < -12) p.x = width + 10
          if (p.x > width + 12) p.x = -10
        } else {
          // Dust motes in sunlight shaft
          p.x += Math.sin(p.phase) * 0.22 + p.vx
          p.y += Math.cos(p.phase * 0.8) * 0.18 + p.vy
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
            const force = (1 - dist / repelRadius) * 1.8
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

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        if (isDark) {
          ctx.fillStyle = `rgba(232, 128, 63, ${p.alpha * 0.85})`
          ctx.shadowColor = 'rgba(232, 128, 63, 0.4)'
          ctx.shadowBlur = 6
        } else {
          ctx.fillStyle = `rgba(165, 105, 45, ${p.alpha * 0.65})`
          ctx.shadowColor = 'rgba(232, 160, 90, 0.25)'
          ctx.shadowBlur = 3
        }
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // 2. Near-neighbour connections
      const maxConnectDist = 78
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i]
          const p2 = particles[j]
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

      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)

    return () => {
      if (animId) cancelAnimationFrame(animId)
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
      {/* a) Soft blurred colour blobs drifting slowly (CSS keyframes) */}
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
