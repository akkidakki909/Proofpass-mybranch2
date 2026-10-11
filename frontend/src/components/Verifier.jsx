import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { DATA, L, R, STEPS, Wt } from '../data.js'

const PIPELINE_STAGES = [
  { id: 1, name: 'Ingest', desc: 'Resume & Git' },
  { id: 2, name: 'Propose', desc: 'LLM Pointers' },
  { id: 3, name: 'Verify', desc: 'File Integrity' },
  { id: 4, name: 'Authorship', desc: 'Commit Depth' },
  { id: 5, name: 'Issue', desc: 'SHA-256 Seal' },
]

const init = (w) => DATA[w].map((d) => ({ n: d.n, f: d.s, ev: d.ev, q: d.q, s: 'U', scan: false }))

async function hs(rows) {
  try {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(rows.map((r) => [r.n, r.s]))))
    return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('')
  } catch {
    return 'unavailable in this browser context'
  }
}

export default function Verifier() {
  const [who, setWho] = useState('A')
  const [rows, setRows] = useState(() => init('A'))
  const [stat, setStat] = useState('Pipeline ready. Click Run to process steps.')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [issued, setIssued] = useState(null)
  const [vr, setVr] = useState('')
  const [mc, setMc] = useState(null)
  const [num, setNum] = useState(0)
  const timers = useRef([])
  const counter = useRef({ v: 0 })

  const clear = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => {
    return () => clear()
  }, [])

  const P = useMemo(() => {
    const p = { V: 0, S: 0, C: 0 }
    if (done)
      Object.entries(R).forEach(([n, w]) => {
        const k = rows.find((r) => r.n === n)
        if (k && k.s in p) p[k.s] += ((w * Wt[k.s]) / 12) * 100
      })
    return p
  }, [rows, done])
  const total = P.V + P.S + P.C

  useEffect(() => {
    let t = null
    try {
      t = gsap.to(counter.current, { v: total, duration: 1.1, ease: 'power2.out', onUpdate: () => setNum(Math.round(counter.current.v)) })
    } catch (e) {
      setNum(Math.round(total))
    }
    return () => {
      if (t) t.kill()
    }
  }, [total])

  const reset = (w) => {
    clear()
    setWho(w)
    setRows(init(w))
    setDone(false)
    setBusy(false)
    setCurrentStep(-1)
    setIssued(null)
    setVr('')
    setMc(null)
    setStat('Pipeline ready. Click Run to process steps.')
  }

  const run = () => {
    if (busy) return
    clear()
    const base = init(who)
    const final = base.map((x) => ({ ...x, s: x.f }))
    setRows(base)
    setDone(false)
    setIssued(null)
    setVr('')
    setMc(null)
    setBusy(true)
    setCurrentStep(0)

    base.forEach((_, i) => {
      const stepIdx = Math.min(4, Math.floor((i * 5) / base.length))
      timers.current.push(
        setTimeout(() => {
          setCurrentStep(stepIdx)
          setStat(`Step 0${stepIdx + 1}: ${STEPS[stepIdx]}...`)
          setRows((r) => r.map((x, j) => (j === i ? { ...x, scan: true } : x)))
        }, i * 650)
      )
      timers.current.push(setTimeout(() => setRows((r) => r.map((x, j) => (j === i ? { ...x, s: x.f } : x))), i * 650 + 600))
    })

    timers.current.push(
      setTimeout(async () => {
        setBusy(false)
        setDone(true)
        setCurrentStep(5)
        setStat('Pipeline completed. Step 05: Passport issued with SHA-256 seal.')
        setIssued(await hs(final))
      }, base.length * 650 + 700)
    )
  }

  const submit = async () => {
    if (mc.val.trim().length < 20) return setMc({ ...mc, msg: 'Answer in a few sentences so it can be graded against your code.' })
    const next = rows.map((x, j) => (j === mc.i ? { ...x, s: 'V', ev: x.ev + ', micro-check passed' } : x))
    setRows(next)
    setMc(null)
    setIssued(await hs(next))
    setVr('Skill upgraded. Passport re-issued with a new hash.')
  }
  const verify = async () => {
    if (!issued) return setVr('Run verification first.')
    setVr((await hs(rows)) === issued ? 'Hash matches. Unchanged since issue.' : 'Hash mismatch. Edited after issue.')
  }
  const tamper = () => {
    if (!issued) return
    setRows((r) => r.map((x, j) => (j === 0 ? { ...x, s: x.s === 'V' ? 'S' : 'V' } : x)))
    setVr('')
  }

  return (
    <>
      <div className="ctl">
        <div className="tg">
          {['A', 'B'].map((w) => (
            <button key={w} className={who === w ? 'on' : ''} onClick={() => !busy && reset(w)}>
              Candidate {w}
            </button>
          ))}
        </div>
        <button className="b mg" onClick={run} disabled={busy}>
          {busy ? 'Running Pipeline...' : 'Run verification pipeline'}
        </button>
      </div>

      {/* Step-by-Step Live Pipeline Stepper */}
      <div className="verifier-pipeline-stepper" aria-label="Live verification pipeline progress">
        <div className="v-stepper-track">
          {PIPELINE_STAGES.map((s, idx) => {
            const isCompleted = done || (busy && currentStep > idx)
            const isActive = busy && currentStep === idx
            return (
              <div key={s.id} className={`v-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                <div className="v-step-bullet">
                  {isCompleted ? (
                    <span className="v-check m">OK</span>
                  ) : (
                    <span className="v-num m">0{s.id}</span>
                  )}
                </div>
                <div className="v-step-text">
                  <span className="v-step-name">{s.name}</span>
                  <span className="v-step-desc m">{s.desc}</span>
                </div>
                {idx < PIPELINE_STAGES.length - 1 && <div className="v-step-arrow m" aria-hidden="true">-&gt;</div>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="dg">
        <div className="pn">
          <p className="m stat" aria-live="polite">{stat}</p>
          {rows.map((r, i) => (
            <div key={r.n} className={'row' + (r.scan ? ' scan' : '')}>
              <i className="sl" />
              <span key={r.s} className={`chip ${r.s}${r.s !== 'U' ? ' flip' : ''}`}>{L[r.s]}</span>
              <b>{r.n}</b>
              <span className="ev">{r.s === 'U' ? 'Awaiting pipeline check' : r.ev}</span>
              {r.s === 'S' && r.q && !mc && (
                <button className="mini" onClick={() => setMc({ i, val: '', msg: '' })}>Micro-check</button>
              )}
              {mc && mc.i === i && (
                <div className="mc">
                  <span className="full">{r.q}</span>
                  <input autoFocus aria-label="Micro-check answer" placeholder="Answer in a few sentences" value={mc.val} onChange={(e) => setMc({ ...mc, val: e.target.value })} />
                  <button className="mini" onClick={submit}>Submit</button>
                  {mc.msg && <span className="full ev">{mc.msg}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="pn">
          <span className="k m">Evidence-weighted role match</span>
          <div className="big">{num}%</div>
          <div className="bar">
            <i className="V" style={{ width: P.V + '%' }} />
            <i className="bs" style={{ width: P.S + '%' }} />
            <i className="bc" style={{ width: P.C + '%' }} />
          </div>
          <p className="ev">Verified 100%, Supported 60%, Claimed 20%, Contradicted 0%. Default weights.</p>
          <span className="k m" style={{ marginTop: 22 }}>Passport hash (SHA-256)</span>
          <code>{issued || 'Run verification to issue'}</code>
          <button className="b g sm" onClick={verify}>Verify hash</button>{' '}
          <button className="b g sm" onClick={tamper}>Simulate an edit</button>
          <p className="vr" aria-live="polite">{vr}</p>
        </div>
      </div>
    </>
  )
}
