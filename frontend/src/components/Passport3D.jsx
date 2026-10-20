import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'

const NODE_COLORS = ['#1D1A17', '#E0742F', '#F3ECDF', '#E0742F', '#1D1A17', '#FFFFFF']
const ROWS = [
  ['V', 'TypeScript / Node.js', 0.86],
  ['S', 'Rust & Systems', 0.64],
  ['V', 'Distributed Systems', 0.92],
  ['S', 'PostgreSQL Engine', 0.55],
  ['V', 'SHA-256 Hashing', 0.78],
  ['C', 'Kubernetes / DevOps', 0.32],
  ['X', 'Legacy COBOL', 0.42],
]
const ROW_COLOR = { V: '#E0742F', S: '#F3ECDF', C: '#8A8173', X: '#D9483B' }
const CHIP_TEXT = { V: 'VERIFIED', S: 'SUPPORTED', C: 'CLAIMED', X: 'CONTRADICTED' }

function createPassportTexture(front) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 1366
  const x = c.getContext('2d')

  // Background in Soft Black #1D1A17
  x.fillStyle = '#1D1A17'
  x.fillRect(0, 0, 1024, 1366)

  // Border inlay in Burnt Orange #E0742F
  x.strokeStyle = '#E0742F'
  x.lineWidth = 6
  x.strokeRect(32, 32, 960, 1302)

  x.strokeStyle = 'rgba(243, 236, 223, 0.35)'
  x.lineWidth = 2
  x.strokeRect(46, 46, 932, 1274)

  if (front) {
    // Header in Ivory #F3ECDF
    x.fillStyle = '#F3ECDF'
    x.font = '800 96px "Bricolage Grotesque", sans-serif'
    x.fillText('ProofPass', 72, 160)

    x.font = '700 24px monospace'
    x.fillStyle = '#E0742F'
    x.fillText('SKILL PASSPORT / OFFICIAL SPECIMEN', 74, 210)

    x.fillStyle = 'rgba(243, 236, 223, 0.8)'
    x.font = '500 20px monospace'
    x.fillText('PASSPORT NO: PP-2026-0001 / CRYPTOGRAPHIC ID', 74, 245)

    // Divider
    x.strokeStyle = 'rgba(224, 116, 47, 0.35)'
    x.lineWidth = 2
    x.beginPath()
    x.moveTo(74, 275)
    x.lineTo(950, 275)
    x.stroke()

    // Skill rows
    ROWS.forEach(([s, label, w], i) => {
      const y = 350 + i * 86

      // Status chip indicator
      x.fillStyle = ROW_COLOR[s]
      x.fillRect(74, y - 24, 24, 24)

      // Skill label
      x.fillStyle = '#F3ECDF'
      x.font = '700 28px "Bricolage Grotesque", sans-serif'
      x.fillText(label, 116, y - 4)

      // Status tag
      x.fillStyle = s === 'V' ? '#E0742F' : (s === 'S' ? '#F3ECDF' : 'rgba(243, 236, 223, 0.7)')
      x.font = '700 18px monospace'
      x.fillText(CHIP_TEXT[s], 750, y - 4)

      // Progress bar background
      x.fillStyle = 'rgba(243, 236, 223, 0.15)'
      x.fillRect(116, y + 10, 780, 16)

      // Progress bar fill
      x.fillStyle = s === 'V' ? '#E0742F' : (s === 'S' ? '#F3ECDF' : 'rgba(243, 236, 223, 0.65)')
      x.fillRect(116, y + 10, 780 * w, 16)
    })

    // Official Verification Stamp in Burnt Orange & Ivory
    x.save()
    x.translate(760, 1100)
    x.rotate(-0.24)

    x.strokeStyle = '#E0742F'
    x.lineWidth = 9
    x.beginPath()
    x.arc(0, 0, 130, 0, Math.PI * 2)
    x.stroke()

    x.strokeStyle = 'rgba(243, 236, 223, 0.45)'
    x.lineWidth = 3
    x.beginPath()
    x.arc(0, 0, 115, 0, Math.PI * 2)
    x.stroke()

    x.fillStyle = '#F3ECDF'
    x.font = '900 42px monospace'
    x.textAlign = 'center'
    x.fillText('VERIFIED', 0, 12)

    x.font = '700 18px monospace'
    x.fillStyle = '#E0742F'
    x.fillText('SHA-256 PROVEN', 0, -50)
    x.fillText('PROOFPASS AUTH', 0, 60)
    x.restore()

    // Footer note
    x.fillStyle = 'rgba(243, 236, 223, 0.85)'
    x.font = '600 20px monospace'
    x.fillText('AUTHENTICATED VIA COMMIT EVIDENCE & CERTS', 74, 1280)
  } else {
    // Back side: security watermark & PP Emblem
    x.strokeStyle = 'rgba(224, 116, 47, 0.25)'
    x.lineWidth = 4
    for (let i = 1; i <= 9; i++) {
      x.beginPath()
      x.arc(512, 683, i * 60, 0, Math.PI * 2)
      x.stroke()
    }

    x.strokeStyle = 'rgba(243, 236, 223, 0.15)'
    x.lineWidth = 2
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2
      x.beginPath()
      x.moveTo(512, 683)
      x.lineTo(512 + Math.cos(angle) * 520, 683 + Math.sin(angle) * 520)
      x.stroke()
    }

    // Central emblem shield
    x.fillStyle = '#2A2521'
    x.beginPath()
    x.arc(512, 683, 160, 0, Math.PI * 2)
    x.fill()
    x.strokeStyle = '#E0742F'
    x.lineWidth = 8
    x.stroke()

    x.fillStyle = '#F3ECDF'
    x.font = '900 120px "Bricolage Grotesque", sans-serif'
    x.textAlign = 'center'
    x.fillText('PP', 512, 725)

    x.fillStyle = '#E0742F'
    x.font = '700 26px monospace'
    x.fillText('PROOFPASS SECURITY SEAL', 512, 920)

    x.fillStyle = 'rgba(243, 236, 223, 0.85)'
    x.font = '500 22px monospace'
    x.fillText('CRYPTOGRAPHICALLY SECURED AGAINST FORGERY', 512, 960)
  }

  const texture = new THREE.CanvasTexture(c)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

export default function Passport3D({ progress, active, reduced }) {
  const host = useRef(null)
  const live = useRef(active)
  const [scanning, setScanning] = useState(false)
  const scanEnergy = useRef(0)

  useEffect(() => {
    live.current = active
  }, [active])

  // Interactive Verification Scan Pulse (Replaces previous card-flip animation)
  const triggerScanPulse = () => {
    setScanning(true)
    scanEnergy.current = 1.0
    setTimeout(() => {
      setScanning(false)
    }, 1200)
  }

  useEffect(() => {
    const el = host.current
    if (!el) return

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch (e) {
      console.warn('WebGL initialization failed', e)
      return undefined
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;outline:none;'
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50)
    camera.position.z = 6.3

    const disposables = []
    const track = (o) => {
      disposables.push(o)
      return o
    }

    const edge = track(new THREE.MeshStandardMaterial({ color: '#14110F', roughness: 0.5, metalness: 0.2 }))
    const frontMap = track(createPassportTexture(true))
    const backMap = track(createPassportTexture(false))

    const passport = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 3.2, 0.14)), [
      edge, edge, edge, edge,
      track(new THREE.MeshStandardMaterial({ map: frontMap, roughness: 0.45, metalness: 0.1 })),
      track(new THREE.MeshStandardMaterial({ map: backMap, roughness: 0.4, metalness: 0.25 }))
    ])

    const group = new THREE.Group()
    group.add(passport)
    scene.add(group)

    // Holographic Laser Scan Beam Mesh
    const scanBeamGeo = track(new THREE.PlaneGeometry(2.42, 0.05))
    const scanBeamMat = track(
      new THREE.MeshBasicMaterial({
        color: '#F3ECDF',
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      })
    )
    const scanBeam = new THREE.Mesh(scanBeamGeo, scanBeamMat)
    scanBeam.position.z = 0.08
    passport.add(scanBeam)

    // Secondary soft glow bar behind the scan beam
    const scanGlowGeo = track(new THREE.PlaneGeometry(2.42, 0.24))
    const scanGlowMat = track(
      new THREE.MeshBasicMaterial({
        color: '#C96A2B',
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      })
    )
    const scanGlow = new THREE.Mesh(scanGlowGeo, scanGlowMat)
    scanGlow.position.z = 0.075
    passport.add(scanGlow)

    // Orbital Evidence Nodes
    const nodes = NODE_COLORS.map((c) => {
      const m = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.09, 24, 24)),
        track(new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.45, roughness: 0.3 }))
      )
      group.add(m)
      return m
    })

    // Glowing Orbital Ring in Burnt Orange #C96A2B
    const ring = new THREE.Mesh(
      track(new THREE.TorusGeometry(2.65, 0.016, 12, 140)),
      track(new THREE.MeshBasicMaterial({ color: '#C96A2B', transparent: true, opacity: 0.55 }))
    )
    ring.rotation.x = 1.3
    group.add(ring)

    // Particle Field in Ivory #F3ECDF
    const arr = new Float32Array(600)
    for (let i = 0; i < 600; i++) {
      arr[i] = (Math.random() - 0.5) * (i % 3 === 2 ? 10 : 20)
    }
    const pg = track(new THREE.BufferGeometry())
    pg.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    const pts = new THREE.Points(
      pg,
      track(new THREE.PointsMaterial({ color: '#F3ECDF', size: 0.035, transparent: true, opacity: 0.4 }))
    )
    scene.add(pts)

    // Lights
    scene.add(new THREE.AmbientLight('#F3ECDF', 1.4))
    const dl = new THREE.DirectionalLight('#FFFFFF', 2.8)
    dl.position.set(3, 4, 5)
    scene.add(dl)

    const pl = new THREE.PointLight('#C96A2B', 45, 16)
    pl.position.set(-3, -1, 3.5)
    scene.add(pl)

    // Container-based responsive sizing
    const updateSize = () => {
      if (!el) return
      const rect = el.getBoundingClientRect()
      const w = Math.max(rect.width, 260)
      const h = Math.max(rect.height, 260)

      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()

      group.position.set(0, 0, 0)

      const aspect = w / h
      let s = 1.05
      if (aspect < 0.75) {
        s = Math.max(0.68, aspect * 1.1)
      } else if (w < 380) {
        s = 0.76
      } else if (w < 480) {
        s = 0.86
      } else {
        s = 1.04
      }
      group.scale.setScalar(s)
    }

    updateSize()
    const ro = new ResizeObserver(updateSize)
    ro.observe(el)

    // Smooth Drag & Gyroscopic Physics (No rigid card flip)
    const mouse = { x: 0, y: 0 }
    let isDragging = false
    let prevX = 0
    let prevY = 0
    let dragRotY = -0.18
    let dragRotX = 0.06
    let velX = 0
    let velY = 0

    const onPointerDown = (e) => {
      isDragging = true
      prevX = e.clientX
      prevY = e.clientY
      try {
        el.setPointerCapture(e.pointerId)
      } catch (_) {}
    }

    const onPointerMove = (e) => {
      const rect = el.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)

      if (isDragging) {
        const dx = e.clientX - prevX
        const dy = e.clientY - prevY
        prevX = e.clientX
        prevY = e.clientY
        velY = dx * 0.007
        velX = dy * 0.006
        dragRotY += velY
        dragRotX += velX
        dragRotX = Math.max(-0.65, Math.min(0.65, dragRotX))
      }
    }

    const onPointerUp = (e) => {
      isDragging = false
      try {
        el.releasePointerCapture(e.pointerId)
      } catch (_) {}
    }

    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    const clock = new THREE.Clock()

    const loop = () => {
      if (!live.current) return

      const t = reduced ? 0 : clock.getElapsedTime()
      const s = progress.current || 0

      if (!isDragging) {
        velX *= 0.92
        velY *= 0.92
        dragRotY += velY
        dragRotX += velX
      }

      // Smooth dampening towards target rotation
      const targetY = dragRotY + mouse.x * 0.32 + s * Math.PI * 2.2 + Math.sin(t * 0.6) * 0.12
      const targetX = dragRotX - mouse.y * 0.22 + Math.cos(t * 0.7) * 0.06

      passport.rotation.y += (targetY - passport.rotation.y) * 0.07
      passport.rotation.x += (targetX - passport.rotation.x) * 0.07
      passport.position.y = Math.sin(t * 1.2) * 0.08

      // Holographic Scan Line Sweep animation
      if (scanEnergy.current > 0.01) {
        scanEnergy.current *= 0.96
      }
      const scanSpeed = 1.6 + scanEnergy.current * 4.0
      const scanY = Math.sin(t * scanSpeed) * 1.45
      scanBeam.position.y = scanY
      scanGlow.position.y = scanY
      scanBeamMat.opacity = 0.5 + scanEnergy.current * 0.5 + Math.abs(Math.sin(t * 4)) * 0.2
      scanGlowMat.opacity = 0.2 + scanEnergy.current * 0.4

      // Orbiting evidence nodes with dynamic pulse expansion
      const nodeRadius = 2.65 + scanEnergy.current * 0.4
      nodes.forEach((m, i) => {
        const a = (i / 7) * 6.283 + t * (0.35 + i * 0.04 + scanEnergy.current * 0.8)
        m.position.set(
          Math.cos(a) * nodeRadius,
          (i - 3) * 0.26 + Math.sin(t * 0.8 + i) * 0.18,
          Math.sin(a) * 1.2 + Math.sin(a) * nodeRadius * Math.cos(1.3) * 0.38
        )
      })

      ring.rotation.z = t * (0.14 + scanEnergy.current * 0.6)
      pts.rotation.y = t * 0.02 + s * 0.4
      group.rotation.y = -s * 0.4
      camera.position.z = 6.3 + s * 1.8

      renderer.render(scene, camera)
    }

    gsap.ticker.add(loop)

    return () => {
      gsap.ticker.remove(loop)
      ro.disconnect()
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)

      disposables.forEach((d) => d.dispose && d.dispose())
      renderer.dispose()
      if (renderer.domElement.parentNode === el) {
        el.removeChild(renderer.domElement)
      }
    }
  }, [progress, reduced])

  return (
    <div className="passport-free-wrapper">
      <div className="passport-free-canvas" ref={host} aria-label="Freely integrated 3D ProofPass passport" />
      <div className="passport-free-actions">
        <button
          type="button"
          className="free-scan-btn m"
          onClick={triggerScanPulse}
          aria-label="Trigger cryptographic verification pulse scan"
        >
          <span className="scan-dot" />
          <span>{scanning ? 'Verifying evidence...' : 'Scan cryptographic proof'}</span>
        </button>
      </div>
    </div>
  )
}
