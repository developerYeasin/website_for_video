import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles, Float } from '@react-three/drei'
import * as THREE from 'three'
import Stage, { damp, clamp01, fitMobile } from './Stage'

const PETALS = 45

function Jar({ s }) {
  const g = useRef(), lid = useRef(), spin = useRef()
  const { viewport } = useThree()
  // Thick-walled glass jar turned on a lathe (outer wall, rim, inner wall, inner floor).
  const body = useMemo(() => new THREE.LatheGeometry([
    [0, -0.62], [0.88, -0.62], [1, -0.52], [1.02, 0.45], [0.98, 0.52], [0.86, 0.52], [0.86, -0.38], [0, -0.38],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 96), [])
  const st8 = useRef({ open: 0 })

  useFrame((st, dt) => {
    const { vals: [x0 = 0, y0 = 0, sc0 = 1, , tilt = 0.25] = [], id, local = 0 } = s.current
    const [x, y, sc] = fitMobile(viewport, x0, y0, sc0, id)
    const k = Math.min(1, viewport.width / 9)
    const tOpen = id === 'open' ? clamp01(local / 0.45) : 0
    const c = st8.current
    c.open = damp(c.open, tOpen, 4, dt)

    g.current.position.x = damp(g.current.position.x, x * k, 2.5, dt)
    g.current.position.y = damp(g.current.position.y, y, 2.5, dt)
    g.current.scale.setScalar(damp(g.current.scale.x, sc * Math.max(0.42, Math.min(1, viewport.width / 6.5)), 3, dt))
    g.current.rotation.x = damp(g.current.rotation.x, tilt + c.open * 0.35 - st.pointer.y * 0.2, 2.5, dt)
    spin.current.rotation.y += dt * (0.25 + Math.min(Math.abs(window.__lenis?.velocity || 0), 50) * 0.01)
    g.current.rotation.z = damp(g.current.rotation.z, -st.pointer.x * 0.15, 2, dt)

    lid.current.position.y = 0.72 + c.open * 1.15
    lid.current.position.x = c.open * 1.5
    lid.current.rotation.z = -c.open * 0.45
  })

  return (
    <group ref={g}>
      <group ref={spin}>
        <mesh geometry={body}>
          <meshPhysicalMaterial transmission={1} roughness={0.22} thickness={0.6} ior={1.4} color="#ffe6ea" attenuationColor="#ffd0dc" attenuationDistance={5} clearcoat={1} clearcoatRoughness={0.1} envMapIntensity={1.3} side={THREE.DoubleSide} />
        </mesh>
        {/* cream with a soft swirl */}
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.85, 0.85, 0.78, 96]} />
          <meshPhysicalMaterial color="#fff3ec" roughness={0.45} sheen={1} sheenColor="#ffd9e4" />
        </mesh>
        <mesh position={[0, 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.32, 0.08, 24, 96, Math.PI * 1.6]} />
          <meshPhysicalMaterial color="#fffaf6" roughness={0.4} sheen={1} sheenColor="#ffe3ea" />
        </mesh>
        <group ref={lid} position={[0, 0.72, 0]}>
          <mesh>
            <cylinderGeometry args={[1.06, 1.06, 0.42, 96]} />
            <meshPhysicalMaterial color="#2a1a1f" metalness={0.1} roughness={0.38} clearcoat={1} clearcoatRoughness={0.05} />
          </mesh>
          <mesh position={[0, 0.215, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.55, 0.6, 96]} />
            <meshStandardMaterial color="#d9a77f" metalness={1} roughness={0.25} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

function Petals() {
  const ref = useRef()
  const geo = useMemo(() => {
    const sh = new THREE.Shape()
    sh.moveTo(0, -0.5)
    sh.bezierCurveTo(0.55, -0.3, 0.5, 0.45, 0, 0.5)
    sh.bezierCurveTo(-0.5, 0.45, -0.55, -0.3, 0, -0.5)
    return new THREE.ShapeGeometry(sh, 10)
  }, [])
  const seeds = useMemo(() => Array.from({ length: PETALS }, () => ({
    x: (Math.random() - 0.5) * 14, y: Math.random() * 10, z: -2 - Math.random() * 3,
    sp: 0.25 + Math.random() * 0.4, w: Math.random() * 6, s: 0.12 + Math.random() * 0.14,
  })), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colors = useMemo(() => {
    const arr = new Float32Array(PETALS * 3)
    const pal = ['#f4b6c8', '#f7c9d6', '#eaa0b8', '#fbd9e2'].map(c => new THREE.Color(c))
    for (let i = 0; i < PETALS; i++) pal[i % 4].toArray(arr, i * 3)
    return arr
  }, [])
  useFrame(st => {
    const t = st.clock.elapsedTime
    seeds.forEach((p, i) => {
      const y = 5 - ((p.y + t * p.sp) % 10)
      dummy.position.set(p.x + Math.sin(t * 0.6 + p.w) * 0.6, y, p.z)
      dummy.rotation.set(t * p.sp * 2 + p.w, Math.sin(t + p.w), t * 0.4)
      dummy.scale.setScalar(p.s)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[geo, null, PETALS]}>
      <instancedBufferAttribute attach="instanceColor" args={[colors, 3]} />
      <meshStandardMaterial roughness={0.7} side={THREE.DoubleSide} transparent opacity={0.85} />
    </instancedMesh>
  )
}

export default function SkinScene({ s }) {
  return (
    <Stage lights="cool">
      <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.5}>
        <Jar s={s} />
      </Float>
      <Petals />
      <Sparkles count={50} scale={[12, 7, 4]} size={3} speed={0.3} color="#ffffff" opacity={0.9} />
    </Stage>
  )
}
