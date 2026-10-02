import { useLayoutEffect, useRef, useState } from 'react'
import TeaScene from '../three/TeaScene'
import { usePageFx, gsap, ScrollTrigger, Marquee, ScrollBar, Cursor, Tilt, Loader, Magnetic, HoverList, Faq, Scramble, Menu, scrollToId } from '../effects'

const teas = [
  { name: 'Golden Oolong', note: 'Honey · Orchid', price: '₹1,450', img: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=900' },
  { name: 'Jasmine Pearl', note: 'Floral · Sweet', price: '₹1,250', img: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=900' },
  { name: 'Smoked Black', note: 'Pine · Malt', price: '₹990', img: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=900' },
]
const notes = [
  ['Golden Oolong', 'Honeyed, orchid-sweet, with a long buttery finish.', '#3a2a12', '#d8a84a', '95°C · 50s'],
  ['Jasmine Pearl', 'Hand-rolled pearls that bloom with night-jasmine.', '#1e2a1c', '#a9c27a', '80°C · 60s'],
  ['Smoked Black', 'Pine-smoked over open fire. Bold, malty, warming.', '#2a1414', '#d27a52', '98°C · 3m'],
]
const houses = [
  { title: 'Kolkata', meta: 'Park Street · Since 1962', img: 'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?w=700' },
  { title: 'Tokyo', meta: 'Omotesandō · Tea bar', img: 'https://images.unsplash.com/photo-1545048702-79362596cdc9?w=700' },
  { title: 'London', meta: 'Marylebone · Tasting room', img: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=700' },
]
const faqs = [
  ['How fresh is the tea?', 'Each batch is packed within weeks of picking and sealed in nitrogen-flushed tins.'],
  ['Do you ship worldwide?', 'Yes — free shipping over ₹2,500 in India, and tracked delivery to 40 countries.'],
  ['Can I book a private tasting?', 'Our tea houses host private ceremonies for up to 8 guests. Reserve two days ahead.'],
]
const ritual = [
  ['Warm', 'Rinse the pot with water at 85°C to wake the glass.'],
  ['Steep', 'Three grams of leaf. Forty seconds. Nothing more.'],
  ['Pour', 'One slow motion, so every cup tastes the same.'],
  ['Savour', 'Breathe in first. The aroma is half the tea.'],
]

export default function Tea() {
  const root = useRef(null)
  const s3d = useRef({ vals: [0, -0.5, 1, 0], id: 'brew', local: 0 })
  const [step, setStep] = useState(0)
  usePageFx(root, s3d)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline({ scrollTrigger: { trigger: '.tea-hero', start: 'top top', end: 'bottom bottom', scrub: 1 } })
        .to('.tea-title', { opacity: 0, scale: 1.25, filter: 'blur(12px)', ease: 'none', duration: 0.3 })
        .to('.tea-hint', { opacity: 0, duration: 0.1 }, 0)
        .fromTo('.tea-brew-copy', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.25 }, 0.55)
      ScrollTrigger.create({
        trigger: '.tea-ritual', start: 'top top', end: 'bottom bottom',
        onUpdate: s => setStep(Math.min(ritual.length - 1, Math.floor(s.progress * ritual.length))),
      })
      gsap.fromTo('.ritual-bar i', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.tea-ritual', start: 'top top', end: 'bottom bottom', scrub: true } })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <div className="tea" ref={root}>
      <Loader label="AUREA" bg="#0b0906" fg="#d8a84a" />
      <ScrollBar color="#d8a84a" />
      <Cursor color="#d8a84a" label="Taste" />
      <TeaScene s={s3d} />

      <header className="tea-head">
        <span className="tea-logo">AUREA<small>Tea House</small></span>
        <ul>{[['Masterpieces', 'masterpieces'], ['The Ritual', 'ritual'], ['The Flavour', 'flavour']].map(([l, id]) => <li key={l} onClick={() => scrollToId(id)}><Scramble text={l} /></li>)}</ul>
        <div className="head-right">
          <Magnetic onClick={() => scrollToId('reserve')}>Reserve now</Magnetic>
          <Menu links={[['Masterpieces', 'masterpieces'], ['The Ritual', 'ritual'], ['The Flavour', 'flavour'], ['Tea houses', 'houses'], ['Reserve', 'reserve']]} bg="#d8a84a" fg="#0b0906" note="Open daily · 8am – 10pm" />
        </div>
      </header>

      <section className="tea-hero" data-3d="0,-0.7,1,0" data-3d-id="brew">
        <div className="tea-sticky">
          <h1 className="tea-title"><span className="line"><span data-intro>Steeped in</span></span><span className="line"><em data-intro>gold.</em></span></h1>
          <div className="tea-brew-copy">
            <p className="eyebrow">Scroll-brewed</p>
            <h2>Hand-picked leaves.<br />Slow ceremony.</h2>
          </div>
          <div className="tea-hint" data-intro>Scroll to brew<i /></div>
        </div>
      </section>

      <Marquee className="tea-marquee" items={['Darjeeling', 'Assam', 'Uji Matcha', 'Wuyi Oolong', 'Nilgiri', 'Yunnan Gold']} />

      <section className="tea-story" data-3d="2.5,-0.2,0.7,-0.6">
        <div>
          <p className="eyebrow" data-reveal>Our origin</p>
          <h2 data-split>From misty hills to your quiet morning.</h2>
          <p data-reveal>Every leaf is picked by hand at dawn, rolled over open fire, and rested for forty days before it reaches your cup.</p>
          <div className="tea-story-img" data-clip data-liquid><img src="https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=1000" alt="Tea ceremony" /></div>
        </div>
      </section>

      <section id="ritual" className="tea-ritual" data-3d="-2.4,-0.3,0.8,0" data-3d-id="ritual">
        <div className="tea-ritual-pin">
          <p className="eyebrow">The Ritual</p>
          <div className="ritual-num">0{step + 1}<small>/0{ritual.length}</small></div>
          <div className="ritual-steps">
            {ritual.map(([t, d], i) => (
              <div key={t} className={`ritual-step ${i === step ? 'on' : i < step ? 'past' : ''}`}><h3>{t}</h3><p>{d}</p></div>
            ))}
          </div>
          <div className="ritual-bar"><i /></div>
        </div>
      </section>

      <section className="tea-fill" data-3d="2.6,-0.3,0.55,0.5">
        <p className="eyebrow" data-reveal>Philosophy</p>
        <p className="fill-text" data-fill>Tea is not a drink you rush. It is forty seconds where nothing else matters — the warmth of the cup, the rise of the steam, the slow unfolding of a leaf picked by hand at dawn.</p>
      </section>

      <section id="masterpieces" className="tea-grid" data-3d="0,-5,0,0">
        <div className="tea-grid-head"><h2 data-split>The Masterpieces</h2><p data-reveal>Three single-estate teas, released in small batches each season.</p></div>
        <div className="tea-cards">
          {teas.map((t, i) => (
            <div key={t.name} data-reveal data-delay={i * 0.12}>
              <Tilt as="figure">
                <div className="tea-img" data-skew data-liquid><img src={t.img} alt={t.name} /></div>
                <figcaption><h3>{t.name}</h3><p><span>{t.note}</span><span>{t.price}</span></p></figcaption>
              </Tilt>
            </div>
          ))}
        </div>
      </section>

      <section id="flavour" className="tea-notes" data-3d="0,-5,0,0">
        <p className="eyebrow">Tasting notes</p>
        <div className="stack" data-stack>
          {notes.map(([n, d, bg, fg, brew], i) => (
            <div className="stack-card tea-note" key={n} style={{ background: bg, color: fg }}>
              <span className="stack-n">0{i + 1}</span>
              <div><h3>{n}</h3><p>{d}</p></div>
              <span className="stack-time">{brew}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="houses" className="tea-houses" data-3d="0,-5,0,0">
        <p className="eyebrow" data-reveal>Visit us</p>
        <h2 className="tea-h2" data-split>Our tea houses</h2>
        <HoverList items={houses} className="tea-list" />
      </section>

      <section className="tea-faq" data-3d="-2.7,-0.4,0.6,0.3">
        <div className="tea-faq-in">
          <p className="eyebrow" data-reveal>Questions</p>
          <Faq items={faqs} />
        </div>
      </section>

      <section id="reserve" className="tea-cta" data-3d="0,-0.9,0.75,0.4">
        <h2 data-split>Reserve a tasting.</h2>
        <div data-reveal><Magnetic>Book your table</Magnetic></div>
      </section>
      <div className="mega" data-chars>AUREA</div>
      <footer className="tea-foot"><span>© AUREA Tea House</span><span>Kolkata · Tokyo · London</span></footer>
    </div>
  )
}
