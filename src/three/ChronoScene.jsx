import { useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import * as THREE from 'three'

// A steel diver's watch, built entirely in code so every layer can come apart cleanly.
// Watch space: case radius ≈ 0.68, dial faces +Y, bracelet loops below in the YZ plane.

const MOBILE = typeof window !== 'undefined' && window.innerWidth < 760
const clamp01 = v => Math.min(1, Math.max(0, v))
const lerp = THREE.MathUtils.lerp
const TAU = Math.PI * 2
const SIDE = MOBILE ? 0 : 1.3
const V2 = (x, y) => new THREE.Vector2(x, y)
const glide = u => 0.75 * u * u * u * (u * (6 * u - 15) + 10) + 0.25 * u

/* ---------------- finishes ---------------- */
export const FINISHES = {
  black: { label: 'Black', swatch: '#15171a', dial: ['#26292d', '#040405'], sunburst: false, insert: '#0b0c0e', print: '#f2f2f2', accent: '#eceef1' },
  olive: { label: 'Olive', swatch: '#4b5a2c', dial: ['#5d6d38', '#1a220f'], sunburst: true, insert: '#0b0c0e', print: '#e9c983', accent: '#e6c27a' },
  blue: { label: 'Blue', swatch: '#2a58b0', dial: ['#3d72d0', '#0c1f4d'], sunburst: true, insert: '#0f2350', print: '#f2f2f2', accent: '#eceef1' },
}

/* ---------------- canvas textures ---------------- */
function canvasTex(size, draw) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d'), size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}
const FONT = 'Inter, Helvetica, Arial, sans-serif'

function dialTexture(f) {
  return canvasTex(2048, (g, S) => {
    const c = S / 2, R = S / 2
    const grad = g.createRadialGradient(c, c * 0.92, 0, c, c, R)
    grad.addColorStop(0, f.dial[0]); grad.addColorStop(1, f.dial[1])
    g.fillStyle = grad; g.fillRect(0, 0, S, S)
    if (f.sunburst) {
      for (let i = 0; i < 1600; i++) {
        const a = (i / 1600) * TAU
        g.strokeStyle = `rgba(255,255,255,${0.01 + Math.random() * 0.03})`
        g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * R, c + Math.sin(a) * R); g.stroke()
      }
    }
    // minute track: dots and bars just inside the rehaut
    g.fillStyle = '#e8e8e8'
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue
      const a = (i / 60) * TAU
      g.beginPath(); g.arc(c + Math.sin(a) * R * 0.9, c - Math.cos(a) * R * 0.9, 5, 0, TAU); g.fill()
    }
    g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillStyle = f.print
    g.font = `600 150px ${FONT}`; g.fillText('12', c, c - R * 0.62)
    g.font = `500 58px ${FONT}`; g.fillText('FS 60P', c, c - R * 0.36)
    g.font = `500 26px ${FONT}`; g.fillStyle = '#d9d9d9'
    g.fillText('N A U T I C A L   I N S T R U M E N T', c, c - R * 0.27)
    g.font = `600 30px ${FONT}`; g.fillText('A U T O M A T I C', c, c + R * 0.24)
    g.font = `600 34px ${FONT}`; g.fillText('3 0  A T M', c, c + R * 0.31)
    g.font = `500 22px ${FONT}`; g.fillText('S W I S S   M A D E', c, c + R * 0.84)
    // date window at 6 with today's date
    g.fillStyle = '#f4f4f2'; g.fillRect(c - 80, c + R * 0.42, 160, 110)
    g.strokeStyle = '#9a9a9a'; g.lineWidth = 6; g.strokeRect(c - 80, c + R * 0.42, 160, 110)
    g.fillStyle = '#111'; g.font = `600 84px ${FONT}`
    g.fillText(String(new Date().getDate()).padStart(2, '0'), c, c + R * 0.42 + 58)
  })
}

// ceramic bezel insert: printed dive scale on the insert colour
function bezelTexture(f) {
  return canvasTex(2048, (g, S) => {
    const c = S / 2, R = S / 2
    g.fillStyle = f.insert; g.fillRect(0, 0, S, S)
    g.fillStyle = f.print; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.font = `600 120px ${FONT}`
    for (let i = 0; i < 60; i++) {
      g.save(); g.translate(c, c); g.rotate((i / 60) * TAU)
      if (i === 0) { g.beginPath(); g.moveTo(0, -R * 0.84); g.lineTo(-55, -R * 0.97); g.lineTo(55, -R * 0.97); g.closePath(); g.fill() }
      else if (i === 15 || i === 30 || i === 45) g.fillText(String(i), 0, -R * 0.905)
      else if (i < 15) g.fillRect(-7, -R * 0.97, 14, R * 0.1)
      else if (i % 5 === 0) g.fillRect(-14, -R * 0.97, 28, R * 0.12)
      else if (i < 15) g.fillRect(-5, -R * 0.97, 10, R * 0.06)
      g.restore()
    }
  })
}

function casebackTexture() {
  return canvasTex(1024, (g, S) => {
    const c = S / 2
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S)
    g.fillStyle = '#6d7076'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.font = `600 44px ${FONT}`
    const text = 'FS 60P · STAINLESS STEEL · WATER RESISTANT 300 M · SAPPHIRE CRYSTAL · '
    for (let i = 0; i < text.length; i++) {
      g.save(); g.translate(c, c); g.rotate((i / text.length) * TAU); g.fillText(text[i], 0, -S * 0.36); g.restore()
    }
  })
}

function stripes() {
  const c = document.createElement('canvas'); c.width = c.height = 512
  const g = c.getContext('2d')
  for (let x = 0; x < 512; x++) {
    const v = 110 + Math.abs(Math.sin((x / 512) * Math.PI * 9)) * 130
    g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, 512)
  }
  return new THREE.CanvasTexture(c)
}

/* ---------------- materials ---------------- */
function useMats() {
  return useMemo(() => {
    const dials = Object.fromEntries(Object.entries(FINISHES).map(([k, f]) => [k, dialTexture(f)]))
    const inserts = Object.fromEntries(Object.entries(FINISHES).map(([k, f]) => [k, bezelTexture(f)]))
    return {
      dials, inserts,
      polished: new THREE.MeshPhysicalMaterial({ color: '#f3f4f6', metalness: 1, roughness: 0.07, clearcoat: 0.3 }),
      brushed: new THREE.MeshPhysicalMaterial({ color: '#d8dbdf', metalness: 1, roughness: 0.27, anisotropy: 0.8 }),
      // lugs face the camera head-on; a softer finish keeps them from mirroring the dark studio
      lug: new THREE.MeshPhysicalMaterial({ color: '#e2e5e9', metalness: 1, roughness: 0.4, envMapIntensity: 1.6 }),
      accent: new THREE.MeshPhysicalMaterial({ color: '#eceef1', metalness: 1, roughness: 0.12 }),
      dial: new THREE.MeshPhysicalMaterial({ map: dials.black, metalness: 0.3, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.1, envMapIntensity: 0.6 }),
      insert: new THREE.MeshPhysicalMaterial({ map: inserts.black, metalness: 0.1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03 }),
      caseback: new THREE.MeshPhysicalMaterial({ color: '#dfe2e6', metalness: 1, roughness: 0.25, map: casebackTexture() }),
      lume: new THREE.MeshStandardMaterial({ color: '#f6fff8', roughness: 0.55, emissive: '#c8ffe2', emissiveIntensity: 0.15 }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#dce8f4', transparent: true, opacity: 0.05, roughness: 0.02, clearcoat: 1, envMapIntensity: 2, depthWrite: false }),
      rim: new THREE.MeshPhysicalMaterial({ color: '#eef4fa', roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.5, envMapIntensity: 2.5 }),
      plate: new THREE.MeshPhysicalMaterial({ color: '#d9dbde', metalness: 1, roughness: 0.32, roughnessMap: stripes() }),
      gold: new THREE.MeshPhysicalMaterial({ color: '#e6c27a', metalness: 1, roughness: 0.2 }),
      blued: new THREE.MeshPhysicalMaterial({ color: '#2346b0', metalness: 1, roughness: 0.18 }),
      ruby: new THREE.MeshPhysicalMaterial({ color: '#b3122c', roughness: 0.08, clearcoat: 1 }),
    }
  }, [])
}

/* ---------------- geometry helpers ---------------- */
function extrudeFlat(pts, depth, bevel = 0.004) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => V2(x, y))), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2 })
  g.rotateX(-Math.PI / 2) // shape +Y → watch −Z (12 o'clock), thickness → +Y
  return g
}

function gearGeo(teeth, r, depth = 0.03) {
  const s = new THREE.Shape(), tooth = r * 0.12
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * TAU, a1 = ((i + 1) / (teeth * 2)) * TAU
    const rr = i % 2 ? r : r + tooth
    if (i === 0) s.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr)
    else s.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr)
    s.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr)
  }
  for (let k = 0; k < 4; k++) {
    const h = new THREE.Path(), a = (k / 4) * TAU, w = Math.PI / 4 - 0.18
    h.absarc(0, 0, r * 0.75, a + 0.18, a + 0.18 + w * 2 - 0.2, false)
    h.absarc(0, 0, r * 0.27, a + 0.18 + w * 2 - 0.2, a + 0.18, true)
    s.holes.push(h)
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 6 })
  g.rotateX(-Math.PI / 2)
  return g
}

/* ---------------- parts ---------------- */
function Case({ m }) {
  const body = useMemo(() => new THREE.LatheGeometry([
    V2(0.52, -0.16), V2(0.6, -0.16), V2(0.655, -0.13), V2(0.68, -0.07), V2(0.685, 0.03), V2(0.67, 0.07), V2(0.6, 0.085), V2(0.52, 0.085), V2(0.52, -0.16),
  ], 160), [])
  const lug = useMemo(() => {
    // side profile (z, y) of one lug, extruded across x and turned so the profile lies in the YZ plane
    const s = new THREE.Shape([V2(0.5, 0.07), V2(0.66, 0.05), V2(0.76, 0.0), V2(0.79, -0.06), V2(0.76, -0.12), V2(0.52, -0.15)])
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4, curveSegments: 8 })
    g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1))
    return g
  }, [])
  return (
    <group>
      <mesh geometry={body} material={m.brushed} />
      <mesh material={m.polished} position={[0, 0.02, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.682, 0.014, 12, 160]} /></mesh>
      {[-1, 1].map(sz => [0.24, -0.34].map(x => (
        <mesh key={`${sz}${x}`} geometry={lug} material={m.lug} position={[x, 0, 0]} scale={[1, 1, sz]} />
      )))}
      {/* crown guards + screw-down crown at 3 o'clock */}
      {[-0.24, 0.24].map(a => (
        <mesh key={a} material={m.brushed} position={[Math.cos(a) * 0.69, -0.03, Math.sin(a) * 0.69]} rotation-y={-a}>
          <primitive object={new RoundedBoxGeometry(0.1, 0.12, 0.08, 3, 0.025)} attach="geometry" />
        </mesh>
      ))}
      <Crown m={m} />
    </group>
  )
}

function Crown({ m }) {
  const ridges = useMemo(() => Array.from({ length: 30 }, (_, i) => (i / 30) * TAU), [])
  return (
    <group position={[0.7, -0.03, 0]} rotation-z={-Math.PI / 2}>
      <mesh material={m.polished}><cylinderGeometry args={[0.04, 0.04, 0.06, 20]} /></mesh>
      <mesh material={m.accent} position={[0, 0.07, 0]}><cylinderGeometry args={[0.085, 0.085, 0.09, 48]} /></mesh>
      {ridges.map(a => (
        <mesh key={a} material={m.accent} position={[Math.cos(a) * 0.087, 0.07, Math.sin(a) * 0.087]} rotation-y={-a}><boxGeometry args={[0.008, 0.08, 0.012]} /></mesh>
      ))}
      <mesh material={m.polished} position={[0, 0.116, 0]}><cylinderGeometry args={[0.07, 0.085, 0.006, 48]} /></mesh>
    </group>
  )
}

function Bezel({ m }) {
  const ring = useMemo(() => new THREE.LatheGeometry([V2(0.53, 0), V2(0.695, 0), V2(0.7, 0.03), V2(0.69, 0.065), V2(0.67, 0.07), V2(0.53, 0.06), V2(0.53, 0)], 180), [])
  const notches = useRef()
  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * TAU
      o.position.set(Math.sin(a) * 0.7, 0.032, -Math.cos(a) * 0.7); o.rotation.set(0, -a, 0); o.updateMatrix()
      notches.current.setMatrixAt(i, o.matrix)
    }
    notches.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <group>
      <mesh geometry={ring} material={m.accent} />
      <instancedMesh ref={notches} args={[new THREE.BoxGeometry(0.012, 0.05, 0.012), m.polished, 120]} />
      <mesh material={m.insert} position={[0, 0.071, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.55, 0.665, 180, 1]} /></mesh>
    </group>
  )
}

function Dial({ m }) {
  const idx = useMemo(() => new RoundedBoxGeometry(0.04, 0.025, 0.11, 2, 0.01), [])
  return (
    <group>
      <mesh material={m.dial} rotation-x={-Math.PI / 2}><circleGeometry args={[0.55, 128]} /></mesh>
      <mesh material={m.brushed} position={[0, -0.01, 0]}><cylinderGeometry args={[0.55, 0.55, 0.02, 128, 1, true]} /></mesh>
      {Array.from({ length: 12 }, (_, i) => {
        if (i === 0 || i === 6) return null // printed 12, date window at 6
        const a = (i / 12) * TAU, r = 0.4
        return (
          <group key={i} position={[Math.sin(a) * r, 0.012, -Math.cos(a) * r]} rotation-y={-a}>
            <mesh geometry={idx} material={m.accent} />
            <mesh material={m.lume} position={[0, 0.013, 0]}><boxGeometry args={[0.024, 0.002, 0.09]} /></mesh>
          </group>
        )
      })}
    </group>
  )
}

function Hands({ m }) {
  const g = useMemo(() => ({
    hour: extrudeFlat([[-0.035, -0.05], [0.035, -0.05], [0.035, 0.22], [0, 0.27], [-0.035, 0.22]], 0.008),
    hourLume: extrudeFlat([[-0.02, 0.02], [0.02, 0.02], [0.02, 0.21], [0, 0.245], [-0.02, 0.21]], 0.002),
    min: extrudeFlat([[-0.028, -0.06], [0.028, -0.06], [0.028, 0.36], [0, 0.42], [-0.028, 0.36]], 0.008),
    minLume: extrudeFlat([[-0.015, 0.03], [0.015, 0.03], [0.015, 0.35], [0, 0.39], [-0.015, 0.35]], 0.002),
  }), [])
  const h = useRef(), mi = useRef(), s = useRef()
  useFrame(() => {
    const d = new Date(), sec = d.getSeconds() + d.getMilliseconds() / 1000
    const min = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + min / 60
    s.current.rotation.y = -(sec / 60) * TAU
    mi.current.rotation.y = -(min / 60) * TAU
    h.current.rotation.y = -(hr / 12) * TAU
  })
  return (
    <group>
      <group ref={h} position={[0, 0.01, 0]}>
        <mesh geometry={g.hour} material={m.accent} />
        <mesh geometry={g.hourLume} material={m.lume} position={[0, 0.011, 0]} />
      </group>
      <group ref={mi} position={[0, 0.026, 0]}>
        <mesh geometry={g.min} material={m.accent} />
        <mesh geometry={g.minLume} material={m.lume} position={[0, 0.011, 0]} />
      </group>
      <group ref={s} position={[0, 0.045, 0]}>
        <mesh material={m.accent} position={[0, 0, -0.18]}><boxGeometry args={[0.008, 0.005, 0.6]} /></mesh>
        <mesh material={m.lume} position={[0, 0.002, -0.36]}><cylinderGeometry args={[0.022, 0.022, 0.006, 24]} /></mesh>
      </group>
      <mesh material={m.accent} position={[0, 0.05, 0]}><cylinderGeometry args={[0.022, 0.026, 0.014, 24]} /></mesh>
    </group>
  )
}

function Crystal({ m }) {
  return (
    <group>
      <mesh material={m.glass} scale={[1, 0.1, 1]}><sphereGeometry args={[0.55, 96, 24, 0, TAU, 0, Math.PI / 2]} /></mesh>
      <mesh material={m.rim} rotation-x={Math.PI / 2}><torusGeometry args={[0.55, 0.012, 12, 128]} /></mesh>
    </group>
  )
}

function Movement({ m, spin }) {
  const gears = useMemo(() => [
    { r: 0.2, n: 30, p: [0.08, 0.05], s: 1, mat: 'gold' },
    { r: 0.11, n: 16, p: [-0.22, 0.18], s: -1.9, mat: 'gold' },
    { r: 0.14, n: 22, p: [-0.12, -0.26], s: -1.4, mat: 'polished' },
    { r: 0.08, n: 12, p: [0.3, -0.22], s: 2.6, mat: 'gold' },
    { r: 0.1, n: 14, p: [0.32, 0.25], s: -2.1, mat: 'polished' },
  ].map(g => ({ ...g, geo: gearGeo(g.n, g.r) })), [])
  const refs = useRef([]), balance = useRef()
  useFrame((st, dt) => {
    const k = dt * (0.6 + spin.current * 3)
    refs.current.forEach((g, i) => g && (g.rotation.y += k * gears[i].s))
    balance.current.rotation.y = Math.sin(st.clock.elapsedTime * 9) * 1.4
  })
  return (
    <group>
      <mesh material={m.plate}><cylinderGeometry args={[0.52, 0.52, 0.04, 96]} /></mesh>
      {gears.map((g, i) => (
        <group key={i} position={[g.p[0], 0.025, g.p[1]]}>
          <mesh ref={el => (refs.current[i] = el)} geometry={g.geo} material={m[g.mat]} />
          <mesh material={m.ruby} position={[0, 0.04, 0]}><cylinderGeometry args={[0.022, 0.022, 0.02, 16]} /></mesh>
        </group>
      ))}
      {[[0.42, 0.1], [-0.4, -0.2], [0.05, -0.45], [-0.1, 0.43]].map(([x, z], i) => (
        <mesh key={i} material={m.blued} position={[x, 0.03, z]}><cylinderGeometry args={[0.025, 0.025, 0.02, 16]} /></mesh>
      ))}
      <group position={[-0.28, 0.05, -0.02]}>
        <group ref={balance}>
          <mesh material={m.gold} rotation-x={Math.PI / 2}><torusGeometry args={[0.12, 0.012, 8, 48]} /></mesh>
          {[0, 1].map(k => <mesh key={k} material={m.gold} rotation-y={k * Math.PI / 2}><boxGeometry args={[0.24, 0.008, 0.012]} /></mesh>)}
        </group>
        <mesh material={m.polished} position={[0.14, 0.03, 0]}><boxGeometry args={[0.36, 0.02, 0.06]} /></mesh>
      </group>
    </group>
  )
}

function Rotor({ m, spin }) {
  const ref = useRef()
  useFrame((_, dt) => { ref.current.rotation.y += dt * (0.5 + spin.current * 4) })
  return (
    <group ref={ref}>
      <mesh material={m.gold}><cylinderGeometry args={[0.48, 0.48, 0.025, 96, 1, false, 0, Math.PI]} /></mesh>
      <mesh material={m.plate} position={[0, 0.014, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.1, 0.4, 64, 1, Math.PI / 2, Math.PI]} /></mesh>
      <mesh material={m.blued} position={[0, 0.02, 0]}><cylinderGeometry args={[0.05, 0.05, 0.035, 24]} /></mesh>
    </group>
  )
}

function Caseback({ m }) {
  const ring = useMemo(() => new THREE.LatheGeometry([V2(0.3, -0.035), V2(0.58, -0.035), V2(0.6, 0), V2(0.58, 0.03), V2(0.3, 0.03), V2(0.3, -0.035)], 128), [])
  return (
    <group>
      <mesh geometry={ring} material={m.brushed} />
      <mesh material={m.caseback} position={[0, -0.036, 0]} rotation-x={Math.PI / 2}><circleGeometry args={[0.58, 96]} /></mesh>
      <mesh material={m.glass}><cylinderGeometry args={[0.31, 0.31, 0.02, 64]} /></mesh>
    </group>
  )
}

// three-row bracelet hanging in a loop from the lugs
const LOOP = new THREE.CatmullRomCurve3([
  [0, -0.06, 0.78], [0, -0.26, 0.97], [0, -0.68, 1.06], [0, -1.12, 0.88], [0, -1.42, 0.44], [0, -1.5, 0],
  [0, -1.42, -0.44], [0, -1.12, -0.88], [0, -0.68, -1.06], [0, -0.26, -0.97], [0, -0.06, -0.78],
].map(p => new THREE.Vector3(...p)))

function Bracelet({ m, fade }) {
  const centre = useRef(), outer = useRef(), N = 28
  const geos = useMemo(() => ({
    centre: new RoundedBoxGeometry(0.15, 0.09, 0.118, 3, 0.03),
    outer: new RoundedBoxGeometry(0.15, 0.08, 0.124, 3, 0.03),
    clasp: new RoundedBoxGeometry(0.46, 0.06, 0.5, 3, 0.025),
  }), [])
  const mats = useMemo(() => ({ p: m.polished.clone(), b: m.brushed.clone() }), [m])
  fade.current = [mats.p, mats.b]
  useLayoutEffect(() => {
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), tan = new THREE.Vector3()
    const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1)
    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N
      LOOP.getPointAt(u, p); LOOP.getTangentAt(u, tan)
      Y.crossVectors(tan, X).normalize()
      q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, tan))
      centre.current.setMatrixAt(i, mtx.compose(p, q, one))
      for (const sx of [-1, 1]) outer.current.setMatrixAt(i * 2 + (sx > 0 ? 1 : 0), mtx.compose(p.clone().addScaledVector(X, sx * 0.152), q, one))
    }
    centre.current.instanceMatrix.needsUpdate = outer.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <group>
      <instancedMesh ref={centre} args={[geos.centre, mats.p, N]} />
      <instancedMesh ref={outer} args={[geos.outer, mats.b, N * 2]} />
      <mesh geometry={geos.clasp} material={mats.p} position={[0, -1.56, 0]} />
    </group>
  )
}

/* ---------------- choreography ---------------- */
const qe = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z))
const FACE = Math.PI / 2 // turns the dial (+Y) toward the camera

// [part, exploded y, stagger order, label]
const LAYERS = [
  ['crystal', 1.75, 3, 'Sapphire crystal'],
  ['bezel', 1.3, 2, 'Ceramic bezel'],
  ['hands', 0.92, 2, 'Hands'],
  ['dial', 0.55, 1, 'Dial'],
  ['case', 0, 0, 'Steel case'],
  ['movement', -0.6, 1, 'Movement'],
  ['rotor', -1.05, 2, 'Rotor'],
  ['caseback', -1.5, 3, 'Caseback'],
]
const BASE_Y = { crystal: 0.13, bezel: 0.075, hands: 0.04, dial: 0.025, case: 0, movement: -0.06, rotor: -0.1, caseback: -0.13 }

// One shot per chapter. p: scroll progress · ex: explode · up: lift the case and everything above it out of
// frame (movement close-up) · spots / labels: callout visibility
const KEYS = [
  { p: 0, pos: [0, 0, 0], q: qe(FACE - 0.08, 0, 0), s: 1.25 },                                         // hero
  { p: 0.118, pos: [SIDE, 0, 0], q: qe(0, -0.6, 0).multiply(qe(FACE - 0.12, 0, 0)), s: 1.45, spots: 1 }, // 01 steel
  { p: 0.28, pos: [SIDE, 0.25, 0], q: qe(0, -1.3, 0).multiply(qe(FACE - 0.22, 0, 0.05)), s: 1.3 },      // 02 profile
  { p: 0.441, pos: [SIDE * 0.85, -0.05, 0], q: qe(0.42, -0.5, 0.05), s: 0.95, ex: 1, labels: 1 },        // 03 unfold
  { p: 0.602, pos: [SIDE * 0.85, -0.6, 0], q: qe(0.5, -1.0, 0.05), s: 1.35, ex: 1, labels: 1 },        // 04 crystal side
  { p: 0.763, pos: [SIDE, 0.6, 0], q: qe(0.85, -1.6, 0.05), s: 2.3, ex: 1, up: 1 },                     // 05 movement
  { p: 0.93, pos: [SIDE * 0.6, 0, 0], q: qe(FACE - 0.06, 0, 0), s: 1.35 },                              // 06 finish
  { p: 1, pos: [SIDE * 0.6, 0, 0], q: qe(FACE - 0.06, 0, 0), s: 1.35 },
].map(k => ({ ex: 0, up: 0, spots: 0, labels: 0, ...k }))

const SPOTS = [
  { at: [0.84, -0.03, 0], label: 'Screw-down crown', side: 'r' },
  { at: [-0.5, 0.07, -0.5], label: 'Ceramic dive bezel', side: 'l' },
  { at: [0, -0.9, 1.05], label: 'Three-row steel bracelet', side: 'r' },
]

function Watch({ progress, finish, labelEls, spotEls }) {
  const m = useMats()
  const root = useRef(), parts = useRef({}), bracelet = useRef(), fade = useRef([])
  const S = useRef({ t: 0, last: 0, intro: 0, finish: null }), spin = useRef(0)
  const q = useMemo(() => new THREE.Quaternion(), [])
  const qp = useMemo(() => new THREE.Quaternion(), [])
  const ep = useMemo(() => new THREE.Euler(), [])
  const v = useMemo(() => new THREE.Vector3(), [])
  const accent = useMemo(() => new THREE.Color(), [])

  useFrame((st, dt) => {
    const s = S.current, time = st.clock.elapsedTime
    s.t = THREE.MathUtils.damp(s.t, progress.current, 2.4, dt)
    spin.current = THREE.MathUtils.damp(spin.current, Math.min(5, Math.abs(s.t - s.last) / Math.max(dt, 1e-3) * 8), 3, dt)
    s.last = s.t
    s.intro = Math.min(1, s.intro + dt / 2.2)
    const t = clamp01(s.t), intro = glide(s.intro)

    let i = 0
    while (i < KEYS.length - 2 && t > KEYS[i + 1].p) i++
    const A = KEYS[i], B = KEYS[i + 1]
    const u = glide(clamp01((t - A.p) / (B.p - A.p)))
    const L = k => lerp(A[k], B[k], u)
    const ex = L('ex'), up = glide(L('up')) * 3.2

    q.copy(A.q).slerp(B.q, u)
    qp.setFromEuler(ep.set(st.pointer.y * -0.1 + Math.sin(time * 0.5) * 0.02, st.pointer.x * 0.16 + Math.sin(time * 0.33) * 0.04 + (1 - intro) * 1.6, (1 - intro) * -0.2))
    root.current.quaternion.copy(qp).multiply(q)
    const x = MOBILE ? 0 : lerp(A.pos[0], B.pos[0], u)
    const y = lerp(A.pos[1], B.pos[1], u) * (MOBILE ? 0.6 : 1) + Math.sin(time * 0.9) * 0.03 + (MOBILE ? -0.35 : 0) - (1 - intro) * 0.4
    root.current.position.set(x, y, 0)
    root.current.scale.setScalar(L('s') * (MOBILE ? 0.62 : 1) * (0.75 + 0.25 * intro))

    // layers ripple apart from the case, each turning slightly, then float
    LAYERS.forEach(([k, y1, order], n) => {
      const g = parts.current[k]
      if (!g) return
      const lag = order * 0.09
      const e = glide(clamp01((ex - lag) / (1 - lag)))
      g.position.y = lerp(BASE_Y[k], y1, e) + Math.sin(time * 1.2 + n) * 0.025 * e + (y1 >= 0 ? up : 0)
      g.rotation.y = e * order * 0.25 * (n % 2 ? 1 : -1)
    })
    parts.current.movement.visible = parts.current.rotor.visible = ex > 0.02

    // bracelet steps back and fades while the head comes apart
    const bA = 1 - clamp01(ex * 2.2)
    bracelet.current.visible = bA > 0.01
    bracelet.current.position.y = -0.8 * (1 - bA)
    fade.current.forEach(mat => { mat.transparent = bA < 0.99; mat.opacity = bA; mat.depthWrite = bA > 0.98 })

    // callouts: spots on the assembled watch, labels beside each exploded layer
    const project = (el, obj, at, w) => {
      if (!el) return
      el.style.opacity = MOBILE ? 0 : w
      if (w < 0.01) return
      v.set(...at); obj.localToWorld(v); v.project(st.camera)
      el.style.transform = `translate3d(${(v.x + 1) / 2 * st.size.width}px, ${(1 - v.y) / 2 * st.size.height + (1 - w) * 12}px, 0)`
    }
    root.current.updateMatrixWorld()
    const sw = L('spots'), lw = L('labels')
    SPOTS.forEach((sp, n) => project(spotEls.current[n], root.current, sp.at, sw))
    // labels sit just right of each layer, measured in the watch's frame so they never cross
    LAYERS.forEach(([k], n) => project(labelEls.current[n], root.current, [0.82, parts.current[k].position.y, 0], lw * (k === 'movement' || k === 'rotor' ? clamp01(ex * 3) : 1)))

    // finish: swap dial / insert prints, ease the accent metal
    const F = FINISHES[finish.current] || FINISHES.black
    if (s.finish !== finish.current) {
      s.finish = finish.current
      m.dial.map = m.dials[s.finish]; m.insert.map = m.inserts[s.finish]
      m.dial.needsUpdate = m.insert.needsUpdate = true
    }
    m.accent.color.lerp(accent.set(F.accent), 1 - Math.exp(-dt * 4))
  })

  const P = { crystal: Crystal, bezel: Bezel, hands: Hands, dial: Dial, case: Case, movement: Movement, rotor: Rotor, caseback: Caseback }
  return (
    <group ref={root}>
      <group ref={bracelet}><Bracelet m={m} fade={fade} /></group>
      {LAYERS.map(([k]) => {
        const C = P[k]
        return <group key={k} ref={el => (parts.current[k] = el)} position-y={BASE_Y[k]}><C m={m} spin={spin} /></group>
      })}
    </group>
  )
}

export default function ChronoScene({ progress, finish }) {
  const labelEls = useRef([]), spotEls = useRef([])
  return (
    <>
      <Canvas className="gl" dpr={[1, MOBILE ? 1.5 : 1.75]} camera={{ fov: 30, position: [0, 0.15, 9] }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        eventSource={document.getElementById('root')} eventPrefix="client">
        <ambientLight intensity={0.2} />
        <directionalLight position={[3, 5, 6]} intensity={1.3} />
        <directionalLight position={[-4, -2, 3]} intensity={0.35} color="#dfe8ff" />
        <Watch progress={progress} finish={finish} labelEls={labelEls} spotEls={spotEls} />
        {/* product studio: dark room, long softboxes and a rim light for crisp metal reflections */}
        <Environment resolution={512}>
          <color attach="background" args={['#1c1d1f']} />
          <Lightformer form="rect" intensity={5} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[8, 1.4, 1]} />
          <Lightformer form="rect" intensity={2.5} position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[1.4, 8, 1]} />
          <Lightformer form="rect" intensity={2.5} position={[5, 1, 1]} rotation-y={-Math.PI / 2} scale={[1.4, 8, 1]} />
          <Lightformer form="rect" intensity={0.8} position={[0, 0.5, 6]} scale={[9, 3.5, 1]} />
          <Lightformer form="rect" intensity={2.5} position={[0, 3, 5]} rotation-x={-0.5} scale={[5, 0.4, 1]} />
          <Lightformer form="rect" intensity={1.2} position={[0, -4, 2]} rotation-x={-Math.PI / 2} scale={[10, 3, 1]} color="#e9e9e6" />
          <Lightformer form="rect" intensity={3} position={[0, 2, -6]} scale={[10, 1, 1]} />
        </Environment>
      </Canvas>
      {/* callouts live in a fixed DOM layer, positioned from 3D anchor points every frame */}
      <div className="cr-spots" aria-hidden="true">
        {SPOTS.map((sp, n) => (
          <div key={sp.label} ref={el => (spotEls.current[n] = el)} className={`cr-spot ${sp.side}`} style={{ opacity: 0 }}><i /><span>{sp.label}</span></div>
        ))}
        {LAYERS.map(([k, , , label], n) => (
          <div key={k} ref={el => (labelEls.current[n] = el)} className="cr-spot r tag" style={{ opacity: 0 }}><i /><span>{label}</span></div>
        ))}
      </div>
    </>
  )
}
