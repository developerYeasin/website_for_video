import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { TeapotGeometry } from 'three/examples/jsm/geometries/TeapotGeometry.js'
import Stage, { damp, clamp01, fitMobile } from './Stage'

const LEAVES = 140

function leafGeometry() {
  const s = new THREE.Shape()
  s.moveTo(0, -0.7)
  s.bezierCurveTo(0.5, -0.3, 0.45, 0.35, 0, 0.75)
  s.bezierCurveTo(-0.45, 0.35, -0.5, -0.3, 0, -0.7)
  return new THREE.ShapeGeometry(s, 8)
}

function Teapot({ s }) {
  const g = useRef(), lid = useRef(), leaves = useRef(), spin = useRef()
  const { viewport } = useThree()
  const geo = useMemo(() => {
    const body = new TeapotGeometry(1, 18, true, false, true, false, true)
    const top = new TeapotGeometry(1, 18, false, true, false, false, true)
    body.computeBoundingBox()
    return { body, top, leaf: leafGeometry(), minY: body.boundingBox.min.y, maxY: body.boundingBox.max.y }
  }, [])
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), [])
  const seeds = useMemo(() => Array.from({ length: LEAVES }, () => ({
    a: Math.random() * Math.PI * 2, r: 0.4 + Math.random() * 2.8, h: 0.4 + Math.random() * 2.6,
    sp: 0.2 + Math.random() * 0.8, rx: Math.random() * 6, s: 0.08 + Math.random() * 0.1,
  })), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const wp = useMemo(() => new THREE.Vector3(), [])
  const st8 = useRef({ lid: 0, leaves: 0, fill: 0.12 })

  useFrame((st, dt) => {
    const { vals: [x0 = 0, y0 = 0, sc0 = 1, rot = 0] = [], id, local = 0 } = s.current
    const [x, y, sc] = fitMobile(viewport, x0, y0, sc0, id)
    const k = Math.min(1, viewport.width / 9)
    // Brewing timeline while the hero is pinned.
    let tLid = 0, tLeaves = 0, tFill = 0.85, tRot = rot
    if (id === 'brew') {
      tLid = clamp01((local - 0.12) / 0.25)
      tLeaves = clamp01((local - 0.2) / 0.45) * (1 - clamp01((local - 0.8) / 0.2))
      tFill = 0.12 + 0.73 * clamp01((local - 0.35) / 0.55)
      tRot = rot + local * 0.8
    } else if (id === 'ritual') {
      tRot = rot + local * Math.PI * 2
    }
    const c = st8.current
    c.lid = damp(c.lid, tLid, 4, dt); c.leaves = damp(c.leaves, tLeaves, 3, dt); c.fill = damp(c.fill, tFill, 2.5, dt)

    g.current.position.x = damp(g.current.position.x, x * k, 2.5, dt)
    g.current.position.y = damp(g.current.position.y, y, 2.5, dt)
    g.current.scale.setScalar(damp(g.current.scale.x, sc * Math.max(0.42, Math.min(1, viewport.width / 6.5)), 3, dt))
    spin.current.rotation.y = damp(spin.current.rotation.y, tRot + st.pointer.x * 0.4, 2.5, dt)
    g.current.rotation.x = damp(g.current.rotation.x, 0.15 - st.pointer.y * 0.15, 2, dt)

    lid.current.position.y = c.lid * 1.4
    lid.current.rotation.z = c.lid * 0.5
    lid.current.position.x = c.lid * -0.6

    // Liquid surface = clipping plane at the current fill height (world space).
    spin.current.getWorldPosition(wp)
    const scale = g.current.scale.x
    plane.constant = wp.y + (geo.minY + (geo.maxY - geo.minY) * c.fill * 0.82) * scale

    const t = st.clock.elapsedTime
    const L = c.leaves
    seeds.forEach((sd, i) => {
      const a = sd.a + t * sd.sp
      dummy.position.set(Math.cos(a) * sd.r * L, 0.6 + sd.h * L + Math.sin(t * sd.sp * 2 + i) * 0.15 * L, Math.sin(a) * sd.r * L * 0.7)
      dummy.rotation.set(sd.rx + t * sd.sp * 2, a, t * sd.sp)
      dummy.scale.setScalar(sd.s * Math.min(1, L * 3))
      dummy.updateMatrix()
      leaves.current.setMatrixAt(i, dummy.matrix)
    })
    leaves.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={g} position={[0, -0.6, 0]}>
      <group ref={spin}>
        <mesh geometry={geo.body}>
          <meshPhysicalMaterial transmission={1} roughness={0} thickness={0.25} ior={1.33} color="#ffffff" envMapIntensity={0.7} clearcoat={1} specularIntensity={1} />
        </mesh>
        <mesh geometry={geo.body} scale={0.94}>
          <meshStandardMaterial color="#c47a1c" emissive="#5a2e05" emissiveIntensity={0.5} roughness={0.15} metalness={0.1} clippingPlanes={[plane]} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={lid} geometry={geo.top}>
          <meshPhysicalMaterial transmission={1} roughness={0} thickness={0.25} ior={1.33} color="#ffffff" envMapIntensity={0.7} clearcoat={1} />
        </mesh>
      </group>
      <instancedMesh ref={leaves} args={[geo.leaf, null, LEAVES]}>
        <meshStandardMaterial color="#6f8a2a" roughness={0.6} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  )
}

export default function TeaScene({ s }) {
  return (
    <Stage camera={{ position: [0, 0.4, 8], fov: 35 }}>
      <spotLight position={[0, 6, 2]} angle={0.5} penumbra={1} intensity={60} color="#ffcf8a" />
      <Teapot s={s} />
      <Sparkles count={120} scale={[14, 8, 6]} size={2.5} speed={0.25} color="#e8b85a" opacity={0.7} />
    </Stage>
  )
}
