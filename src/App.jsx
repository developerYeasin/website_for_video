import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger, LiquidFx, ToTop } from './effects'
import Chrono from './pages/Chrono.jsx'
import Studio from './pages/Studio.jsx'
import Tea from './pages/Tea.jsx'
import Skincare from './pages/Skincare.jsx'
import Aether from './pages/Aether.jsx'
import Infinity from './pages/Infinity.jsx'

export default function App() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const curtain = useRef(null)
  const busy = useRef(false)

  // Curtain sweeps up over the old page, then the new page's own loader takes over.
  const go = to => e => {
    e.preventDefault()
    if (to === pathname || busy.current) return
    busy.current = true
    gsap.timeline({ onComplete: () => { busy.current = false } })
      .set(curtain.current, { yPercent: 100, display: 'block' })
      .to(curtain.current, { yPercent: 0, duration: 0.7, ease: 'expo.inOut' })
      .add(() => navigate(to))
      .set(curtain.current, { display: 'none' }, '+=0.05')
  }

  // Inertia smooth scroll, driven by GSAP's ticker so ScrollTrigger stays in sync.
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1 })
    window.__lenis = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const raf = t => lenis.raf(t * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    return () => { gsap.ticker.remove(raf); lenis.destroy() }
  }, [])

  useEffect(() => {
    window.__lenis?.scrollTo(0, { immediate: true })
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <nav className="switcher">
        <NavLink to="/" end onClick={go('/')}>Chronos</NavLink>
        <NavLink to="/studio" onClick={go('/studio')}>Studio</NavLink>
        <NavLink to="/tea" onClick={go('/tea')}>Aurea Tea</NavLink>
        <NavLink to="/skincare" onClick={go('/skincare')}>Skincare</NavLink>
        <NavLink to="/aether" onClick={go('/aether')}>Aether</NavLink>
        <NavLink to="/infinity" onClick={go('/infinity')}>Infinity</NavLink>
      </nav>
      <div className="curtain" ref={curtain} />
      <LiquidFx />
      <ToTop key={pathname} />
      <Routes>
        <Route path="/" element={<Chrono />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/tea" element={<Tea />} />
        <Route path="/skincare" element={<Skincare />} />
        <Route path="/aether" element={<Aether />} />
        <Route path="/infinity" element={<Infinity />} />
      </Routes>
    </>
  )
}
