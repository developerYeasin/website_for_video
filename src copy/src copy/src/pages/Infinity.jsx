import { useEffect, useRef, useState } from 'react'
import InfinityScene, { ZONES, ZONE, START } from '../three/InfinityScene'
import { Cursor, Loader, Magnetic, openContact } from '../effects'

const STEP = ZONE / 3 // three words per world

// Scroll wheel, touch and arrow keys feed an endless distance instead of moving the page.
export default function Infinity() {
  const dist = useRef(0)
  const speed = useRef(0)
  const [ui, setUi] = useState({ d: 0, i: 0 })

  useEffect(() => {
    window.__lenis?.stop()
    document.documentElement.classList.add('no-scroll')
    let target = 0, ty = 0, raf
    const wheel = e => { e.preventDefault(); target += e.deltaY * 0.06 }
    const tstart = e => { ty = e.touches[0].clientY }
    const tmove = e => { e.preventDefault(); const y = e.touches[0].clientY; target += (ty - y) * 0.12; ty = y }
    const key = e => {
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) target += 25
      if (['ArrowUp', 'PageUp'].includes(e.key)) target -= 25
    }
    const loop = () => {
      target += 0.08                              // gentle drift so it is never still
      const prev = dist.current
      dist.current += (target - dist.current) * 0.08
      speed.current = dist.current - prev
      setUi(u => {
        const i = Math.floor((Math.max(0, dist.current) + START) / STEP)
        return i !== u.i || Math.abs(u.d - dist.current) > 1 ? { d: dist.current, i } : u
      })
      raf = requestAnimationFrame(loop)
    }
    loop()
    addEventListener('wheel', wheel, { passive: false })
    addEventListener('touchstart', tstart, { passive: true })
    addEventListener('touchmove', tmove, { passive: false })
    addEventListener('keydown', key)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('wheel', wheel); removeEventListener('touchstart', tstart)
      removeEventListener('touchmove', tmove); removeEventListener('keydown', key)
      document.documentElement.classList.remove('no-scroll')
      window.__lenis?.start()
    }
  }, [])

  const zi = Math.floor(ui.i / 3) % ZONES.length
  const zone = ZONES[zi]
  const word = zone.words[ui.i % 3]
  const line = zone.line
  const loop = Math.floor(ui.i / (3 * ZONES.length)) + 1
  const local = ((Math.max(0, ui.d) + START) % STEP) / STEP          // 0..1 within the current word
  const fade = Math.sin(local * Math.PI)
  return (
    <div className="inf">
      <Loader label="∞" bg="#05030c" fg="#fff" />
      <Cursor color="#ffffff" label="Fly" />
      <InfinityScene dist={dist} speed={speed} />

      <header className="inf-head">
        <span className="inf-logo">∞ INFINITY</span>
        <Magnetic className="inf-btn" onClick={openContact}>Start a project</Magnetic>
      </header>

      <div className="inf-stage" aria-live="polite">
        <p className="inf-loop" key={'z' + zi}>World {String(zi + 1).padStart(2, '0')} / {String(ZONES.length).padStart(2, '0')} · {zone.name} · Loop {loop}</p>
        <h1 key={ui.i} style={{ opacity: 0.15 + fade * 0.85, transform: `scale(${0.85 + local * 0.3})`, letterSpacing: `${(1 - fade) * 0.3}em` }}>{word}</h1>
        <p className="inf-line" key={'l' + zi}>{line}</p>
      </div>

      <div className="inf-meter">
        <span>DISTANCE</span>
        <strong>{Math.floor(Math.max(0, ui.d) * 10).toLocaleString()}</strong>
        <span>METRES · NO END</span>
      </div>
      <div className="inf-worlds" aria-hidden="true">
        {ZONES.map((z, i) => <span key={z.name} className={i === zi ? 'on' : ''} title={z.name} />)}
      </div>
      <div className="inf-hint">{ui.d < 30 ? 'Scroll — forever' : '∞'}</div>
    </div>
  )
}
