import { useEffect, useRef, useState } from 'react'
import AetherScene from '../three/AetherScene'
import { usePageFx, ScrollTrigger, ScrollBar, Cursor, Loader, Magnetic, Scramble, openContact } from '../effects'

const chapters = [
  { id: 'origin', n: '01', k: 'Origin', title: 'Every idea starts as stardust.', body: 'Sixty thousand points of light, spinning in real time — drawn by your graphics card, not a video.' },
  { id: 'velocity', n: '02', k: 'Velocity', title: 'Then it finds speed.', body: 'Scroll is the throttle. Move faster and the tunnel answers back.' },
  { id: 'shift', n: '03', k: 'Shift', title: 'Ideas change shape.', body: 'Twenty thousand particles flow from a sphere into a knot into a ring — morphing live on the GPU as you scroll.' },
  { id: 'clarity', n: '04', k: 'Clarity', title: 'Built from light.', body: 'Real glass refraction — every colour you see is light bending through the crystal.' },
  { id: 'skyline', n: '05', k: 'Skyline', title: 'Then they grow.', body: 'A city of light rises from the ground as you fly through it — three hundred towers, each one alive.' },
  { id: 'horizon', n: '06', k: 'Horizon', title: 'A world that moves with you.', body: 'A living landscape, rebuilt sixty times a second as the waves roll toward the sun.' },
  { id: 'arrival', n: '07', k: 'Arrival', title: 'Your brand, here.', body: "This is what a website can feel like. Let's build yours." },
]

export default function Aether() {
  const root = useRef(null)
  const progress = useRef(0)
  const [hud, setHud] = useState({ ch: 0, p: 0, v: 0 })
  usePageFx(root)

  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: root.current, start: 'top top', end: 'bottom bottom',
      onUpdate: s => {
        progress.current = s.progress
        setHud({ ch: Math.min(chapters.length - 1, Math.floor(s.progress * chapters.length)), p: s.progress, v: Math.abs(s.getVelocity()) })
      },
    })
    return () => st.kill()
  }, [])

  const speed = Math.round(1200 + hud.v * 4.2)
  return (
    <div className="aether" ref={root}>
      <Loader label="AETHER" bg="#04020a" fg="#9fd8ff" />
      <ScrollBar color="linear-gradient(90deg,#3dd6ff,#ff4fd8,#ffd13d)" />
      <Cursor color="#9fd8ff" label="Fly" />
      <AetherScene progress={progress} />

      <header className="ae-head">
        <span className="ae-logo">AETHER<i /></span>
        <ul>{chapters.map(c => <li key={c.id}><Scramble text={c.k} /></li>)}</ul>
        <Magnetic className="ae-btn" onClick={openContact}>Start a project</Magnetic>
      </header>

      {/* HUD */}
      <aside className="ae-hud" aria-hidden="true">
        <div className="hud-chapters">
          {chapters.map((c, i) => <span key={c.id} className={i === hud.ch ? 'on' : ''}>{c.n}<b>{c.k}</b></span>)}
        </div>
        <div className="hud-meter"><i style={{ transform: `scaleY(${hud.p})` }} /></div>
      </aside>
      <div className="hud-corner tl" aria-hidden="true">SYS / ONLINE<br />RENDER · WEBGL2</div>
      <div className="hud-corner br" aria-hidden="true">
        <span>VELOCITY</span><strong>{speed.toLocaleString()}</strong><span>KM/S</span>
      </div>

      <section className="ae-hero">
        <p className="ae-kicker"><span data-intro>A journey in five chapters</span></p>
        <h1><span className="line"><span data-intro>AETHER</span></span></h1>
        <p className="ae-sub"><span data-intro>Scroll to fly</span></p>
      </section>

      {chapters.map((c, i) => (
        <section key={c.id} className={`ae-ch ${i % 2 ? 'right' : ''} ${i === chapters.length - 1 ? 'last' : ''}`}>
          <div className="ae-card">
            <p className="ae-n" data-reveal>{c.n} — {c.k}</p>
            <h2 data-split>{c.title}</h2>
            <p data-reveal>{c.body}</p>
            {i === chapters.length - 1 && <div data-reveal><Magnetic className="ae-btn big" onClick={openContact}>Start your project →</Magnetic></div>}
          </div>
        </section>
      ))}
    </div>
  )
}
