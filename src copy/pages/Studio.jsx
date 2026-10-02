import { useLayoutEffect, useRef } from 'react'
import StudioScene from '../three/StudioScene'
import { usePageFx, gsap, Marquee, ScrollBar, Cursor, Tilt, Loader, Magnetic, HoverList, Faq, Scramble, Menu, scrollToId, openContact } from '../effects'

const work = [
  { img: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1400', title: 'Velocità Motors', tag: 'Automotive · WebGL', year: '2026' },
  { img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400', title: 'Casa Serena', tag: 'Real estate · Scroll', year: '2026' },
  { img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1400', title: 'Tempo Watches', tag: 'E-commerce · 3D', year: '2025' },
  { img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1400', title: 'Strider', tag: 'Product · Motion', year: '2025' },
  { img: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=1400', title: 'Optica', tag: 'Fashion · Lookbook', year: '2025' },
]
const steps = [
  ['Discover', 'Workshops, audits and a sharp brief. We learn your business before we touch a pixel.', '#d9cbb3', '1 – 2 weeks'],
  ['Design', 'Moodboards, then real pages in motion. You review prototypes, not static PDFs.', '#c9b18e', '2 – 4 weeks'],
  ['Build', 'Hand-coded React and WebGL, tuned for 90+ Lighthouse scores on mobile.', '#a8875f', '3 – 6 weeks'],
  ['Grow', 'Launch, measure, iterate. Monthly reports and A/B tests that move numbers.', '#6e5236', 'Ongoing'],
]
const journal = [
  { title: 'Why scroll is the new storytelling', meta: 'Essay · 6 min', img: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=700' },
  { title: 'WebGL without killing your phone', meta: 'Guide · 9 min', img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=700' },
  { title: 'Typography that sells luxury', meta: 'Notes · 4 min', img: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=700' },
  { title: 'Inside the Velocità launch', meta: 'Case study · 12 min', img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=700' },
]
const faqs = [
  ['How long does a website take?', 'Most projects launch in 6 to 10 weeks, depending on pages, 3D work and content readiness.'],
  ['Will it be fast on mobile?', 'Yes. 3D scenes scale down on phones, images are lazy-loaded and we test on real mid-range devices.'],
  ['Can my team edit the content?', 'Every site ships with a simple CMS, so text, images and products can change without a developer.'],
  ['What does it cost?', 'Projects start at a fixed price after a free discovery call. No surprises, no hourly billing.'],
]
const services = [
  ['01', 'Strategy', 'We find what makes your brand worth scrolling for.'],
  ['02', 'Design', 'Bold layouts, real typography, motion that means something.'],
  ['03', 'Development', 'React, WebGL and scroll engines — fast on every device.'],
  ['04', 'Launch', 'SEO, analytics and a site your team can actually edit.'],
]

export default function Studio() {
  const root = useRef(null)
  const s3d = useRef({ vals: [0, 0, 1], id: 'hero', local: 0 })
  usePageFx(root, s3d)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Pinned image grows from a card into full-bleed.
      gsap.timeline({ scrollTrigger: { trigger: '.st-zoom', start: 'top top', end: '+=150%', pin: true, scrub: 1 } })
        .fromTo('.st-zoom-img', { clipPath: 'inset(22% 30% 22% 30% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none' })
        .fromTo('.st-zoom-img img', { scale: 1.35 }, { scale: 1, ease: 'none' }, 0)
        .from('.st-zoom h2 .w>span', { yPercent: 120, stagger: 0.05, ease: 'power3.out' }, 0.5)
      // Page turns dark at the end.
      gsap.to(root.current, { '--bg': '#141210', '--fg': '#efece4', scrollTrigger: { trigger: '.st-cta', start: 'top 70%', end: 'top 20%', scrub: true } })
      // Hero words drift apart.
      gsap.to('.st-big .l1', { xPercent: -25, scrollTrigger: { trigger: '.st-hero', start: 'top top', end: 'bottom top', scrub: true } })
      gsap.to('.st-big .l2', { xPercent: 25, scrollTrigger: { trigger: '.st-hero', start: 'top top', end: 'bottom top', scrub: true } })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <div className="studio" ref={root}>
      <Loader label="wearebrand" bg="#141210" fg="#efece4" />
      <ScrollBar color="var(--fg)" />
      <Cursor color="#1a1a1a" label="View" />
      <StudioScene s={s3d} />

      <header className="st-head">
        <span className="st-logo">w.</span>
        <ul>{[['Work', 'work'], ['Studio', 'process'], ['Journal', 'journal'], ['Contact', 'contact']].map(([l, id]) => <li key={l} onClick={() => scrollToId(id)}><Scramble text={l} /></li>)}</ul>
        <div className="head-right">
          <Magnetic className="st-btn" onClick={() => scrollToId('contact')}>Let's talk</Magnetic>
          <Menu links={[['Work', 'work'], ['Studio', 'process'], ['Journal', 'journal'], ['Contact', 'contact']]} bg="#1a1a1a" fg="#efece4" note="hello@wearebrand.studio" />
        </div>
      </header>

      <section className="st-hero" data-3d="0,0,1" data-3d-id="hero">
        <p className="st-kicker"><span data-intro>Independent web studio — est. 2019</span></p>
        <h1 className="st-big">
          <span className="line"><span className="l1" data-intro>EVERY</span></span>
          <span className="line"><span className="l2 outline" data-intro>SITE.</span></span>
        </h1>
        <div className="st-hero-foot">
          <p data-intro>We design and build websites that feel alive — motion, depth and story in every scroll.</p>
          <span className="st-scroll" data-intro>Scroll<i /></span>
        </div>
      </section>

      <Marquee className="st-marquee" items={['Websites in 2026', 'WebGL', 'Motion design', 'Brand identity', 'Scroll stories']} />

      <section className="st-manifesto" data-3d="2.6,0.3,0.55">
        <p className="st-label" data-reveal>(Manifesto)</p>
        <h2 data-split>A website isn't a brochure anymore. It's the first handshake, the showroom and the salesperson — all at once.</h2>
      </section>

      <section className="st-zoom" data-3d="0,-7,0">
        <div className="st-zoom-img"><img src={work[0].img} alt="Featured project" /></div>
        <h2 data-split="manual">Colour with depth.</h2>
      </section>

      <section id="work" className="st-hz" data-3d="0,-7,0">
        <div className="st-hz-head">
          <h3>Selected work</h3><span>({String(work.length).padStart(2, '0')})</span>
        </div>
        <div className="st-hz-track" data-hscroll>
          {work.map((w, i) => (
            <Tilt as="figure" key={w.title} className="st-work" data-skew data-liquid>
              <div className="st-work-img"><img src={w.img} alt={w.title} /></div>
              <figcaption><span>0{i + 1}</span><b>{w.title}</b><span>{w.tag}</span><span>{w.year}</span></figcaption>
            </Tilt>
          ))}
        </div>
      </section>

      <section className="st-fill" data-3d="2.8,0.4,0.5">
        <p className="st-label" data-reveal>(Our belief)</p>
        <p className="fill-text" data-fill>We don't make templates. Every site starts as a blank canvas and a single question: what should your customer feel in the first three seconds? Then we build everything around that feeling.</p>
      </section>

      <section className="st-stats" data-3d="-2.8,0,0.5">
        {[[120, '+', 'Sites launched'], [38, '', 'Awards & mentions'], [4, 'x', 'Avg. conversion lift'], [99, '%', 'Client retention']].map(([n, s, l], i) => (
          <div key={l} data-reveal data-delay={i * 0.1}><strong data-count={n} data-suffix={s}>0</strong><span>{l}</span></div>
        ))}
      </section>

      <section id="process" className="st-process" data-3d="0,-7,0">
        <p className="st-label">(Process)</p>
        <h2 className="st-h2" data-split>How we work</h2>
        <div className="stack" data-stack>
          {steps.map(([t, d, c, time], i) => (
            <div className="stack-card" key={t} style={{ background: c }}>
              <span className="stack-n">0{i + 1}</span>
              <div><h3>{t}</h3><p>{d}</p></div>
              <span className="stack-time">{time}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="st-services" data-3d="3,-0.6,0.45">
        <p className="st-label" data-reveal>(Services)</p>
        {services.map(([n, t, d]) => (
          <div key={n} className="st-service" data-reveal><span>{n}</span><h4>{t}</h4><p>{d}</p></div>
        ))}
      </section>

      <section id="journal" className="st-journal" data-3d="0,-7,0">
        <p className="st-label" data-reveal>(Journal)</p>
        <h2 className="st-h2" data-split>Thoughts on the web</h2>
        <HoverList items={journal} />
      </section>

      <section className="st-faq" data-3d="-3,0.3,0.45">
        <div className="st-faq-in">
          <p className="st-label" data-reveal>(FAQ)</p>
          <h2 className="st-h2" data-split>Good questions</h2>
          <Faq items={faqs} />
        </div>
      </section>

      <section id="contact" className="st-cta" data-3d="0,0.2,1.15">
        <p className="st-label" data-reveal>(Next step)</p>
        <h2 data-split>Comment “NEW SITE”</h2>
        <div data-reveal><Magnetic className="st-btn big" onClick={openContact}>Start your project →</Magnetic></div>
      </section>
      <div className="mega" data-chars>wearebrand</div>
      <footer className="st-foot"><span>wearebrand © 2026</span><span>Instagram · Behance · Dribbble</span></footer>
    </div>
  )
}
