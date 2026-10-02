import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import SkinScene from '../three/SkinScene'
import { usePageFx, gsap, Marquee, ScrollBar, Cursor, Tilt, Loader, Magnetic, Compare, Faq, Scramble, Menu, scrollToId } from '../effects'

const products = [
  { name: 'Glow Serum', price: '$38', c: 'mini-0', d: 'Vitamin C + niacinamide' },
  { name: 'Velvet Cream', price: '$46', c: 'mini-1', d: 'Ceramides + peptides' },
  { name: 'Dew Toner', price: '$29', c: 'mini-2', d: 'Rose water + hyaluronic' },
]
const routine = [
  ['Morning', 'Cleanse · Dew Toner · Glow Serum · SPF', '#fde8d8', '☀'],
  ['Evening', 'Double cleanse · Dew Toner · Velvet Cream', '#efe3f5', '☾'],
  ['Weekly', 'Gentle enzyme mask, then a thick layer of Velvet Cream overnight.', '#f7d6df', '✦'],
]
const faqs = [
  ['Is it safe for sensitive skin?', 'Every formula is fragrance-free and tested on sensitive skin types. Patch-test first if you have allergies.'],
  ['How long until I see results?', 'Most people feel softer skin within a week; tone and texture improve over 4 to 6 weeks.'],
  ['Is the jar recyclable?', 'Yes. The glass jar and aluminium lid are fully recyclable, and refills ship in compostable pouches.'],
]
const FACE = 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=1400'
const ingredients = [
  ['Rose Hip', 'Brightens dull skin', '#f4b6c8', -1, -1],
  ['Squalane', 'Locks in moisture', '#fde8d8', 1, -1],
  ['Peptides', 'Firms & smooths', '#e9d5f5', -1, 1],
  ['Ceramides', 'Repairs the barrier', '#f7e3c9', 1, 1],
]

export default function Skincare() {
  const root = useRef(null)
  const s3d = useRef({ vals: [1.9, -0.1, 1, 0, 0.3], id: 'hero', local: 0 })
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lume-cart')) || {} } catch { return {} }
  })
  useEffect(() => { try { localStorage.setItem('lume-cart', JSON.stringify(cart)) } catch { /* storage unavailable */ } }, [cart])
  const [drawer, setDrawer] = useState(false)
  const [bump, setBump] = useState(0)
  const count = Object.values(cart).reduce((a, b) => a + b, 0)
  const total = products.reduce((sum, p) => sum + (cart[p.name] || 0) * +p.price.slice(1), 0)
  const add = name => { setCart(c => ({ ...c, [name]: (c[name] || 0) + 1 })); setBump(b => b + 1) }
  const change = (name, d) => setCart(c => {
    const n = Math.max(0, (c[name] || 0) + d)
    const next = { ...c, [name]: n }
    if (!n) delete next[name]
    return next
  })
  const openDrawer = v => { setDrawer(v); v ? window.__lenis?.stop() : window.__lenis?.start() }
  usePageFx(root, s3d)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: '.skin-open', start: 'top top', end: 'bottom bottom', scrub: 1 } })
      tl.to('.skin-open h2', { opacity: 0.12, scale: 0.9, duration: 0.3 })
      gsap.utils.toArray('.ingr').forEach((el, i) => {
        const dx = +el.dataset.dx, dy = +el.dataset.dy
        tl.fromTo(el, { x: 0, y: 0, scale: 0, opacity: 0 }, {
          x: () => dx * Math.min(innerWidth * 0.28, 360), y: () => dy * Math.min(innerHeight * 0.2, 170) + 40,
          scale: 1, opacity: 1, ease: 'back.out(1.6)', duration: 0.35,
        }, 0.25 + i * 0.07)
      })
      gsap.to('.skin-bg', { '--h': 1, scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: true } })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <div className="skin" ref={root}>
      <Loader label="lumé" bg="#f6e4ea" fg="#b06a85" />
      <ScrollBar color="#b06a85" />
      <Cursor color="#b06a85" label="Shop" />
      <div className="skin-bg" />
      <SkinScene s={s3d} />

      <header className="skin-head">
        <span className="skin-logo">lumé</span>
        <ul>{[['Shop', 'shop'], ['Ritual', 'ritual'], ['Ingredients', 'ingredients'], ['About', 'about']].map(([l, id]) => <li key={l} onClick={() => scrollToId(id)}><Scramble text={l} /></li>)}</ul>
        <div className="head-right">
          <Magnetic key={bump} className={`cart-btn ${bump ? 'bump' : ''}`} onClick={() => openDrawer(true)}>Cart ({count})</Magnetic>
          <Menu links={[['Shop', 'shop'], ['Ritual', 'ritual'], ['Ingredients', 'ingredients'], ['About', 'about']]} bg="#b06a85" fg="#fbf3f5" note="Free shipping over $60" />
        </div>
      </header>

      <section className="skin-hero" data-3d="1.9,-0.1,1,0,0.3" data-3d-id="hero">
        <div className="skin-copy">
          <p className="tag"><span data-intro>New · Velvet Cream</span></p>
          <h1><span className="line"><span data-intro>Our jar,</span></span><span className="line"><em data-intro>your glow.</em></span></h1>
          <p data-intro>Clean, gentle skincare that melts into skin and leaves a soft, dewy finish.</p>
          <div data-intro><Magnetic className="skin-btn" onClick={() => scrollToId('shop')}>Shop now</Magnetic></div>
        </div>
        <div className="skin-badge" data-intro><svg viewBox="0 0 100 100"><defs><path id="c" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" /></defs><text><textPath href="#c">clean · vegan · cruelty free · dermatologist tested ·</textPath></text></svg></div>
      </section>

      <Marquee className="skin-marquee" items={['Vegan', 'Cruelty free', 'Dermatologist tested', 'Fragrance free', 'Recyclable glass']} />

      <section id="ingredients" className="skin-open" data-3d="0,-0.4,1.15,0,0.15" data-3d-id="open">
        <div className="skin-open-pin">
          <h2>What's inside<br /><em>matters.</em></h2>
          {ingredients.map(([n, d, c, dx, dy]) => (
            <div key={n} className="ingr" data-dx={dx} data-dy={dy} style={{ background: c }}><b>{n}</b><span>{d}</span></div>
          ))}
        </div>
      </section>

      <section className="skin-stats" data-3d="-2.9,0,0.6,0,0.4">
        <div />
        <div className="skin-stats-list">
          {[[97, '%', 'saw softer skin in 7 days'], [12, '', 'clean ingredients'], [0, '', 'parabens or sulfates']].map(([n, s, l], i) => (
            <div key={l} data-reveal data-delay={i * 0.1}><strong data-count={n} data-suffix={s}>0</strong><span>{l}</span></div>
          ))}
        </div>
      </section>

      <section className="skin-compare" data-3d="0,-5,0,0,0">
        <p className="tag" data-reveal>Drag to compare</p>
        <h2 data-split>Softer in seven days.</h2>
        <div data-reveal>
          <Compare
            before={<img src={FACE} alt="Skin before" className="cmp-before" />}
            after={<img src={FACE} alt="Skin after" className="cmp-after" />}
            labels={['Day 1', 'Day 7']}
          />
        </div>
        <p className="cmp-note" data-reveal>Illustrative visual only — results vary.</p>
      </section>

      <section id="shop" className="skin-products" data-3d="0,-5,0,0,0">
        <h2 data-split>The ritual, in three steps.</h2>
        <div className="skin-grid">
          {products.map((p, i) => (
            <div key={p.name} data-reveal data-delay={i * 0.12}>
              <Tilt as="figure" data-skew>
                <div className={`mini ${p.c}`}><div className="mini-jar" /></div>
                <figcaption><h3>{p.name}</h3><p>{p.d}</p><span>{p.price}</span></figcaption>
                <button className={`add-btn ${cart[p.name] ? 'done' : ''}`} onClick={() => add(p.name)}>
                  {cart[p.name] ? `Added ✓  (${cart[p.name]})` : 'Add to cart'}
                </button>
              </Tilt>
            </div>
          ))}
        </div>
      </section>

      <section id="ritual" className="skin-routine" data-3d="0,-5,0,0,0">
        <p className="tag">Your routine</p>
        <div className="stack" data-stack>
          {routine.map(([t, d, c, icon]) => (
            <div className="stack-card skin-card" key={t} style={{ background: c }}>
              <span className="stack-n">{icon}</span>
              <div><h3>{t}</h3><p>{d}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="skin-fill" data-3d="2.9,0,0.55,0,0.4">
        <p className="fill-text" data-fill>We believe skincare should feel like a pause, not a chore. Fewer steps, honest ingredients, and textures you actually look forward to every morning.</p>
      </section>

      <section className="skin-quote" data-3d="2.9,0,0.6,0,0.4">
        <blockquote data-split>“My skin has never felt this calm. It's like a glass of water for your face.”</blockquote>
        <cite data-reveal>— sample review, replace with a real one</cite>
      </section>

      <section className="skin-faq" data-3d="-2.9,0,0.55,0,0.4">
        <div className="skin-faq-in">
          <p className="tag" data-reveal>FAQ</p>
          <h2 data-split>Questions, answered.</h2>
          <Faq items={faqs} />
        </div>
      </section>

      <div className="mega" data-chars>lumé</div>
      <footer className="skin-foot"><span className="skin-logo">lumé</span><span>Website for a skincare brand · 2026</span></footer>

      <div className={`drawer-veil ${drawer ? 'open' : ''}`} onClick={() => openDrawer(false)} />
      <aside className={`drawer ${drawer ? 'open' : ''}`} data-lenis-prevent>
        <div className="drawer-head"><h3>Your bag</h3><button onClick={() => openDrawer(false)} aria-label="Close">×</button></div>
        <div className="drawer-items">
          {!count && <p className="drawer-empty">Your bag is empty. Add something soft.</p>}
          {products.filter(p => cart[p.name]).map(p => (
            <div className="d-item" key={p.name}>
              <div className={`d-thumb ${p.c}`} />
              <div><h4>{p.name}</h4>
                <div className="qty"><button onClick={() => change(p.name, -1)}>−</button>{cart[p.name]}<button onClick={() => change(p.name, 1)}>+</button></div>
              </div>
              <span>${(cart[p.name] * +p.price.slice(1)).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="drawer-foot">
          <div className="drawer-total"><span>Subtotal</span><b>${total.toFixed(2)}</b></div>
          <button className="skin-btn" disabled={!count}>Checkout</button>
          <p className="drawer-note">Demo store — checkout isn't connected.</p>
        </div>
      </aside>
    </div>
  )
}
