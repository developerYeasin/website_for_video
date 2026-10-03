import { useEffect, useRef, useState } from 'react'
import ChronoScene, { FINISHES } from '../three/ChronoScene'
import { usePageFx, ScrollTrigger, ScrollBar, Cursor, Loader, Magnetic, openContact } from '../effects'

const chapters = [
  { n: '01', k: 'Steel', title: 'Built for the deep.', body: 'A screw-down crown, a ceramic dive bezel and a three-row bracelet, all in brushed and polished steel.' },
  { n: '02', k: 'Profile', title: 'Slim where it counts.', body: 'Under fifteen millimetres from crystal to caseback, so it slides under a cuff.' },
  { n: '03', k: 'Unfold', title: 'Every part, in order.', body: 'Scroll and the watch comes apart, layer by layer, in the order it was built.' },
  { n: '04', k: 'Layers', title: 'Eight parts. One watch.', body: 'Sapphire, ceramic, steel and a living movement, stacked in the order they are built.' },
  { n: '05', k: 'Movement', title: 'The heart keeps beating.', body: 'Gears, jewels and a balance wheel at 4 Hz. Scroll faster and they spin faster.', specs: true },
  { n: '06', k: 'Finish', title: 'Choose your dial.', finish: true },
]

const SPECS = [
  { v: 21, s: '', k: 'Jewels' },
  { v: 4, s: 'Hz', k: 'Beat rate' },
  { v: 42, s: 'h', k: 'Reserve' },
]

export default function Chrono() {
  const root = useRef(null)
  const progress = useRef(0)
  const finish = useRef('black')
  const [tone, setTone] = useState('black')
  const [ch, setCh] = useState(-1)
  usePageFx(root)

  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: root.current, start: 'top top', end: 'bottom bottom',
      onUpdate: s => {
        progress.current = s.progress
        if (s.progress < 0.05) setCh(-1)
      },
    })
    // each chapter card fades in while its section owns the screen, then hands over to the next
    const cards = [...root.current.querySelectorAll('.cr-ch')].map((sec, i) => ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 75%',
      toggleClass: { targets: sec.querySelector('.cr-card'), className: 'on' },
      onToggle: self => self.isActive && setCh(i),
    }))
    return () => { st.kill(); cards.forEach(c => c.kill()) }
  }, [])

  const pick = key => { finish.current = key; setTone(key) }

  return (
    <div className="chrono" ref={root}>
      <Loader label="FS 60P" bg="#eeeeec" fg="#111111" />
      <ScrollBar color="#111" />
      <Cursor color="#111111" label="Scroll" />
      <ChronoScene progress={progress} finish={finish} />

      <header className="cr-head">
        <span className="cr-logo">FS 60P</span>
        <ul>{chapters.map(c => <li key={c.k}>{c.k}</li>)}</ul>
        <Magnetic className="cr-btn" onClick={openContact}>Start a project</Magnetic>
      </header>

      <aside className={`cr-hud ${ch < 0 ? 'off' : ''}`} aria-hidden="true">
        {chapters.map((c, i) => <span key={c.k} className={i === ch ? 'on' : ''}>{c.n}<b>{c.k}</b></span>)}
      </aside>

      <section className="cr-hero">
        <div className="cr-disc" aria-hidden="true" />
        <h1><span className="line"><span data-intro>FS</span></span><span className="line"><span data-intro>60P</span></span></h1>
        <p className="cr-kicker"><span data-intro>Model</span><b><span data-intro>146GB</span></b></p>
        <p className="cr-sub"><span data-intro>Scroll to take it apart</span></p>
      </section>

      {chapters.map((c, i) => (
        <section key={c.k} className={`cr-ch ${i === chapters.length - 1 ? 'last' : ''}`}>
          <div className="cr-card">
            <p className="cr-n">{c.n} — {c.k}</p>
            <h2>{c.title}</h2>
            {c.body && <p>{c.body}</p>}
            {c.specs && (
              <div className="cr-specs">
                {SPECS.map(sp => (
                  <div key={sp.k}><b data-count={sp.v} data-suffix={sp.s}>0</b><span>{sp.k}</span></div>
                ))}
              </div>
            )}
            {c.finish && (
              <>
                <div className="cr-finish" role="radiogroup" aria-label="Case finish">
                  {Object.entries(FINISHES).map(([key, f]) => (
                    <button key={key} role="radio" aria-checked={tone === key} className={tone === key ? 'on' : ''} onClick={() => pick(key)}>
                      <i style={{ background: f.swatch }} />{f.label}
                    </button>
                  ))}
                </div>
                <Magnetic className="cr-btn big" onClick={openContact}>Start your project →</Magnetic>
              </>
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
