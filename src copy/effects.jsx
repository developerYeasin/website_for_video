import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
export { gsap, ScrollTrigger }

/*
  Wires every declarative effect inside `root`:
    data-split            words rise in one by one
    data-reveal           fade + rise on enter
    data-parallax="0.2"   drifts while scrolling (scrub)
    data-count="120"      counts up on enter (data-suffix for "+", "%"...)
    data-clip             image wipes open on enter
    data-hscroll          horizontal track, its parent section gets pinned
    data-3d="x,y,scale,..." + data-3d-id
                          while the section is centred, the WebGL scene's
                          target becomes these values; `local` is the
                          section's own 0..1 progress.
*/
export function usePageFx(root, scene3d) {
  useLayoutEffect(() => {
    const el = root.current
    const ctx = gsap.context(() => {
      el.querySelectorAll('[data-split]').forEach(node => {
        if (!node.dataset.done) {
          node.dataset.done = 1
          node.innerHTML = node.textContent.trim().split(/\s+/)
            .map(w => `<span class="w"><span>${w}</span></span>`).join(' ')
        }
        if (node.dataset.split === 'manual') return
        gsap.from(node.querySelectorAll('.w>span'), {
          yPercent: 115, rotate: 6, duration: 1.2, ease: 'expo.out', stagger: 0.045,
          scrollTrigger: { trigger: node, start: 'top 88%' },
        })
      })

      gsap.utils.toArray(el.querySelectorAll('[data-reveal]')).forEach(node => {
        gsap.from(node, {
          y: 90, opacity: 0, duration: 1.3, ease: 'expo.out', delay: +(node.dataset.delay || 0),
          scrollTrigger: { trigger: node, start: 'top 90%' },
        })
      })

      el.querySelectorAll('[data-parallax]').forEach(node => {
        gsap.to(node, {
          yPercent: -100 * +node.dataset.parallax, ease: 'none',
          scrollTrigger: { trigger: node, start: 'top bottom', end: 'bottom top', scrub: true },
        })
      })

      el.querySelectorAll('[data-count]').forEach(node => {
        const o = { v: 0 }
        gsap.to(o, {
          v: +node.dataset.count, duration: 2, ease: 'power3.out',
          onUpdate: () => { node.textContent = Math.round(o.v) + (node.dataset.suffix || '') },
          scrollTrigger: { trigger: node, start: 'top 90%' },
        })
      })

      el.querySelectorAll('[data-clip]').forEach(node => {
        gsap.fromTo(node, { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.15 }, {
          clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.6, ease: 'expo.out',
          scrollTrigger: { trigger: node, start: 'top 85%' },
        })
      })

      // Words light up one after another as the paragraph scrolls through.
      el.querySelectorAll('[data-fill]').forEach(node => {
        if (!node.dataset.done) {
          node.dataset.done = 1
          node.innerHTML = node.textContent.trim().split(/\s+/).map(w => `<span class="fw">${w}</span>`).join(' ')
        }
        gsap.fromTo(node.querySelectorAll('.fw'), { opacity: 0.12 }, {
          opacity: 1, stagger: 0.1, ease: 'none',
          scrollTrigger: { trigger: node, start: 'top 80%', end: 'bottom 45%', scrub: true },
        })
      })

      // Sticky cards: each one shrinks back as the next slides over it.
      el.querySelectorAll('[data-stack]').forEach(stack => {
        const cards = [...stack.children]
        cards.forEach((card, i) => {
          card.style.top = `calc(14vh + ${i * 22}px)`
          if (i === cards.length - 1) return
          gsap.fromTo(card, { scale: 1, filter: 'brightness(1)' }, {
            scale: 0.9 + i * 0.02, filter: 'brightness(0.85)', ease: 'none',
            scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 20%', scrub: true },
          })
        })
      })

      el.querySelectorAll('[data-hscroll]').forEach(track => {
        const dist = () => track.scrollWidth - window.innerWidth + window.innerWidth * 0.1
        gsap.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: { trigger: track.parentElement, pin: true, scrub: 1, end: () => '+=' + dist(), invalidateOnRefresh: true },
        })
      })

      // Giant words: letters rise one by one.
      el.querySelectorAll('[data-chars]').forEach(node => {
        if (!node.dataset.done) {
          node.dataset.done = 1
          node.innerHTML = [...node.textContent.trim()].map(c => `<span class="ch"><span>${c}</span></span>`).join('')
        }
        gsap.from(node.querySelectorAll('.ch>span'), {
          yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.06,
          scrollTrigger: { trigger: node, start: 'top 92%' },
        })
      })

      // Media leans with scroll speed, then settles.
      const skews = gsap.utils.toArray(el.querySelectorAll('[data-skew]'))
      if (skews.length) {
        const proxy = { s: 0 }
        const set = gsap.quickSetter(skews, 'skewY', 'deg')
        const clampS = gsap.utils.clamp(-7, 7)
        ScrollTrigger.create({
          onUpdate: self => {
            const s = clampS(self.getVelocity() / -400)
            if (Math.abs(s) > Math.abs(proxy.s)) {
              proxy.s = s
              gsap.to(proxy, { s: 0, duration: 0.8, ease: 'power3', overwrite: true, onUpdate: () => set(proxy.s) })
            }
          },
        })
      }

      if (scene3d) {
        el.querySelectorAll('[data-3d]').forEach(node => {
          const vals = node.dataset['3d'].split(',').map(Number)
          const id = node.dataset['3dId'] || ''
          ScrollTrigger.create({
            trigger: node, start: 'top 60%', end: 'bottom 60%',
            onToggle: s => { if (s.isActive) Object.assign(scene3d.current, { vals, id }) },
            onUpdate: s => { if (scene3d.current.id === id) scene3d.current.local = s.progress },
          })
        })
      }
    }, el)
    const t = setTimeout(() => { ScrollTrigger.sort(); ScrollTrigger.refresh() }, 300)
    return () => { clearTimeout(t); ctx.revert() }
  }, [root, scene3d])
}

// Drifts on its own; scrolling speeds it up and scrolling up reverses it.
export function Marquee({ items, className = '' }) {
  const track = useRef(null)
  useEffect(() => {
    let x = 0, dir = 1
    const tick = (t, dt) => {
      if (!track.current) return
      const v = window.__lenis?.velocity || 0
      if (Math.abs(v) > 0.5) dir = v > 0 ? 1 : -1
      x -= dir * (0.6 + Math.min(Math.abs(v), 80) * 0.25) * (dt / 16.7)
      const half = track.current.scrollWidth / 2
      if (x <= -half) x += half
      if (x > 0) x -= half
      track.current.style.transform = `translate3d(${x}px,0,0)`
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])
  const row = items.map((t, i) => <span key={i}>{t}<i>✦</i></span>)
  return <div className={`marquee ${className}`}><div className="marquee-track" ref={track}>{row}{row}</div></div>
}

export function ScrollBar({ color }) {
  const ref = useRef(null)
  useEffect(() => {
    const st = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => { if (ref.current) ref.current.style.transform = `scaleX(${s.progress})` } })
    return () => st.kill()
  }, [])
  return <div ref={ref} className="scrollbar" style={{ background: color }} />
}

export function Cursor({ color, label }) {
  const dot = useRef(null)
  const ring = useRef(null)
  useEffect(() => {
    if (matchMedia('(pointer: coarse)').matches) return
    const xd = gsap.quickTo(dot.current, 'x', { duration: 0.1 }), yd = gsap.quickTo(dot.current, 'y', { duration: 0.1 })
    const xr = gsap.quickTo(ring.current, 'x', { duration: 0.5, ease: 'power3' }), yr = gsap.quickTo(ring.current, 'y', { duration: 0.5, ease: 'power3' })
    const move = e => { xd(e.clientX); yd(e.clientY); xr(e.clientX); yr(e.clientY) }
    const over = e => {
      if (!ring.current) return
      const hit = e.target.closest('a,button,figure,article')
      ring.current.classList.toggle('big', !!hit)
      ring.current.dataset.label = hit?.tagName === 'FIGURE' ? (label || 'View') : ''
    }
    addEventListener('mousemove', move)
    addEventListener('mouseover', over)
    return () => { removeEventListener('mousemove', move); removeEventListener('mouseover', over) }
  }, [label])
  return (
    <>
      <div ref={dot} className="cur-dot" style={{ background: color }} />
      <div ref={ring} className="cur-ring" style={{ borderColor: color, color }} />
    </>
  )
}

// Magnetic button: pulls towards the pointer.
export function Magnetic({ children, className = '', ...rest }) {
  const ref = useRef(null)
  const move = e => {
    const r = ref.current.getBoundingClientRect()
    gsap.to(ref.current, { x: (e.clientX - r.left - r.width / 2) * 0.35, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.6, ease: 'power3' })
  }
  const leave = () => gsap.to(ref.current, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1,0.35)' })
  return <button ref={ref} className={className} onMouseMove={move} onMouseLeave={leave} {...rest}>{children}</button>
}

export const CONTACT_URL = 'https://maestrilabs.com/contact'
export const openContact = () => window.open(CONTACT_URL, '_blank', 'noopener')

export function Tilt({ children, className = '', as: Tag = 'article', ...rest }) {
  const ref = useRef(null)
  const move = e => {
    const r = ref.current.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    gsap.to(ref.current, { rotateY: px * 14, rotateX: -py * 14, transformPerspective: 900, duration: 0.6, ease: 'power3' })
  }
  const leave = () => gsap.to(ref.current, { rotateY: 0, rotateX: 0, duration: 1, ease: 'elastic.out(1,0.4)' })
  return <Tag ref={ref} className={`tilt ${className}`} onMouseMove={move} onMouseLeave={leave} {...rest}>{children}</Tag>
}

// Intro: counter 0→100, then the curtain lifts and hero lines rise.
export function Loader({ label, bg, fg }) {
  const ref = useRef(null)
  const [n, setN] = useState(0)
  useLayoutEffect(() => {
    const o = { v: 0 }
    const tl = gsap.timeline()
    tl.to(o, { v: 100, duration: 1.4, ease: 'power2.inOut', onUpdate: () => setN(Math.round(o.v)) })
      .to(ref.current, { yPercent: -100, duration: 1.1, ease: 'expo.inOut' })
      .from('[data-intro]', { yPercent: 120, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: 0.1 }, '-=0.5')
    return () => tl.kill()
  }, [])
  return (
    <div ref={ref} className="loader" style={{ background: bg, color: fg }}>
      <span className="loader-label">{label}</span>
      <span className="loader-num">{String(n).padStart(3, '0')}</span>
    </div>
  )
}

// List rows that show a floating image following the cursor.
export function HoverList({ items, className = '' }) {
  const img = useRef(null)
  const [cur, setCur] = useState(null)
  useEffect(() => {
    const x = gsap.quickTo(img.current, 'x', { duration: 0.6, ease: 'power3' })
    const y = gsap.quickTo(img.current, 'y', { duration: 0.6, ease: 'power3' })
    const move = e => { x(e.clientX); y(e.clientY) }
    addEventListener('mousemove', move)
    return () => removeEventListener('mousemove', move)
  }, [])
  return (
    <div className={`hover-list ${className}`} onMouseLeave={() => setCur(null)}>
      {items.map((it, i) => (
        <div key={it.title} className={`hl-row ${cur === i ? 'on' : ''}`} onMouseEnter={() => setCur(i)} data-reveal>
          <span>{String(i + 1).padStart(2, '0')}</span><h4>{it.title}</h4><p>{it.meta}</p>
        </div>
      ))}
      <div ref={img} className="hl-follow">
        <div className={`hl-img ${cur !== null ? 'show' : ''}`}>
          {items.map((it, i) => <img key={it.img} src={it.img} alt="" style={{ opacity: cur === i ? 1 : 0 }} />)}
        </div>
      </div>
    </div>
  )
}

// Drag to compare two layers.
export function Compare({ before, after, labels = ['Before', 'After'] }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(50)
  const drag = e => {
    if (e.type !== 'pointerdown' && e.buttons !== 1) return
    const r = ref.current.getBoundingClientRect()
    setPos(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)))
  }
  return (
    <div ref={ref} className="compare" onPointerDown={drag} onPointerMove={drag}>
      <div className="cmp-layer">{after}</div>
      <div className="cmp-layer" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>{before}</div>
      <span className="cmp-label l">{labels[0]}</span><span className="cmp-label r">{labels[1]}</span>
      <div className="cmp-handle" style={{ left: `${pos}%` }}><i>⟷</i></div>
    </div>
  )
}

export function Faq({ items }) {
  const [open, setOpen] = useState(0)
  return (
    <div className="faq">
      {items.map(([q, a], i) => (
        <div key={q} className={`faq-item ${open === i ? 'open' : ''}`} data-reveal>
          <button onClick={() => setOpen(open === i ? -1 : i)}><span>{q}</span><i>+</i></button>
          <div className="faq-a"><p>{a}</p></div>
        </div>
      ))}
    </div>
  )
}

// Letters shuffle through random glyphs before settling, on hover.
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+=<>'
export function Scramble({ text }) {
  const [out, setOut] = useState(text)
  const raf = useRef(0)
  const run = () => {
    cancelAnimationFrame(raf.current)
    let f = 0
    const tick = () => {
      f++
      setOut([...text].map((c, i) => (c === ' ' || i < f / 2 ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join(''))
      if (f / 2 < text.length) raf.current = requestAnimationFrame(tick)
    }
    tick()
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return <span className="scramble" onMouseEnter={run}>{out}</span>
}

// Full-screen menu that opens as a growing circle from its button.
export function Menu({ links, bg, fg, note }) {
  const [open, setOpen] = useState(false)
  const panel = useRef(null)
  const btn = useRef(null)
  useEffect(() => {
    const r = btn.current.getBoundingClientRect()
    const at = `${r.left + r.width / 2}px ${r.top + r.height / 2}px`
    const tl = gsap.timeline()
    if (open) {
      window.__lenis?.stop()
      tl.set(panel.current, { display: 'flex' })
        .fromTo(panel.current, { clipPath: `circle(0% at ${at})` }, { clipPath: `circle(150% at ${at})`, duration: 1, ease: 'expo.inOut' })
        .fromTo(panel.current.querySelectorAll('.menu-link>span'), { yPercent: 110 }, { yPercent: 0, stagger: 0.06, duration: 1, ease: 'expo.out' }, '-=0.45')
        .fromTo(panel.current.querySelectorAll('.menu-foot'), { opacity: 0, y: 20 }, { opacity: 0.6, y: 0, duration: 0.6 }, '-=0.6')
    } else if (panel.current.style.display === 'flex') {
      window.__lenis?.start()
      tl.to(panel.current, { clipPath: `circle(0% at ${at})`, duration: 0.8, ease: 'expo.inOut' })
        .set(panel.current, { display: 'none' })
    }
    return () => tl.kill()
  }, [open])
  return (
    <>
      <button ref={btn} className={`menu-btn ${open ? 'x' : ''}`} onClick={() => setOpen(o => !o)} aria-label="Menu" style={{ background: open ? fg : bg, color: open ? bg : fg }}>
        <i /><i />
      </button>
      <div ref={panel} className="menu-panel" style={{ background: bg, color: fg }}>
        <nav>
          {links.map(([l, id], i) => (
            <a key={l} className="menu-link" href={`#${id}`} onClick={e => { e.preventDefault(); setOpen(false); setTimeout(() => scrollToId(id), 850) }}>
              <span><small>0{i + 1}</small><Scramble text={l} /></span>
            </a>
          ))}
        </nav>
        <div className="menu-foot"><span>{note}</span><span>Instagram · LinkedIn · Behance</span></div>
      </div>
    </>
  )
}

export const scrollToId = id => {
  const el = document.getElementById(id)
  if (el) window.__lenis?.scrollTo(el, { duration: 1.8, easing: t => 1 - Math.pow(1 - t, 4) })
}

// Hovering [data-liquid] media ripples it through one shared SVG displacement filter.
export function LiquidFx() {
  const turb = useRef(null)
  const disp = useRef(null)
  useEffect(() => {
    let current = null
    const o = { s: 0, f: 0.01 }
    const apply = () => {
      disp.current?.setAttribute('scale', o.s)
      turb.current?.setAttribute('baseFrequency', `${o.f} ${o.f * 2.2}`)
    }
    const enter = e => {
      const host = e.target.closest?.('[data-liquid]')
      if (!host || host === current) return
      current = host
      const img = host.querySelector('img') || host
      img.style.filter = 'url(#liquid)'
      gsap.fromTo(o, { s: 0, f: 0.02 }, { s: 38, f: 0.008, duration: 0.5, ease: 'power2.out', onUpdate: apply,
        onComplete: () => gsap.to(o, { s: 0, duration: 0.9, ease: 'power3.out', onUpdate: apply, onComplete: () => { img.style.filter = '' } }) })
    }
    const leave = e => { if (current && !current.contains(e.relatedTarget)) current = null }
    document.addEventListener('mouseover', enter)
    document.addEventListener('mouseout', leave)
    return () => { document.removeEventListener('mouseover', enter); document.removeEventListener('mouseout', leave) }
  }, [])
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <filter id="liquid" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence ref={turb} type="fractalNoise" baseFrequency="0.01 0.022" numOctaves="2" seed="3" />
        <feDisplacementMap ref={disp} in="SourceGraphic" scale="0" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  )
}

// Circle with a scroll-progress ring; returns you to the top.
export function ToTop() {
  const ring = useRef(null)
  const btn = useRef(null)
  useEffect(() => {
    const C = 2 * Math.PI * 22
    const st = ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: s => {
        if (!ring.current || !btn.current) return
        ring.current.style.strokeDashoffset = C * (1 - s.progress)
        btn.current.classList.toggle('show', s.scroll() > window.innerHeight * 0.8)
      },
    })
    return () => st.kill()
  })
  return (
    <button ref={btn} className="to-top" aria-label="Back to top" onClick={() => window.__lenis?.scrollTo(0, { duration: 2 })}>
      <svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="22" className="tt-bg" /><circle ref={ring} cx="25" cy="25" r="22" className="tt-ring" /></svg>
      <span>↑</span>
    </button>
  )
}
