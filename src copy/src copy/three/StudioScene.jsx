import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MeshDistortMaterial, Sparkles } from '@react-three/drei'
import Stage, { damp, fitMobile } from './Stage'

function Orb({ s }) {
  const g = useRef(), inner = useRef(), ring = useRef(), ring2 = useRef(), mat = useRef()
  const { viewport } = useThree()
  useFrame((st, dt) => {
    const [x = 0, y = 0, sc = 1] = fitMobile(viewport, ...s.current.vals, s.current.id)
    const k = Math.min(1, viewport.width / 9)
    const vel = Math.min(Math.abs(window.__lenis?.velocity || 0), 60)
    g.current.position.x = damp(g.current.position.x, x * k, 2.5, dt)
    g.current.position.y = damp(g.current.position.y, y, 2.5, dt)
    const scale = damp(g.current.scale.x, sc * Math.max(0.42, Math.min(1, viewport.width / 6.5)), 3, dt)
    g.current.scale.setScalar(scale)
    g.current.rotation.x = damp(g.current.rotation.x, st.pointer.y * 0.5, 2, dt)
    g.current.rotation.z = damp(g.current.rotation.z, -st.pointer.x * 0.3, 2, dt)
    inner.current.rotation.y += dt * (0.25 + vel * 0.02)
    mat.current.distort = damp(mat.current.distort, 0.28 + vel * 0.008, 4, dt)
    ring.current.rotation.x += dt * 0.35
    ring.current.rotation.y += dt * 0.2
    ring2.current.rotation.y -= dt * 0.3
    ring2.current.rotation.z += dt * 0.15
  })
  return (
    <group ref={g}>
      <mesh ref={inner}>
        <icosahedronGeometry args={[1.25, 96]} />
        <MeshDistortMaterial ref={mat} color="#6e3519" metalness={0.75} roughness={0.16} distort={0.3} speed={1.8} envMapIntensity={1.6} />
      </mesh>
      <mesh ref={ring} rotation={[1.2, 0, 0]}>
        <torusGeometry args={[1.95, 0.012, 16, 200]} />
        <meshStandardMaterial color="#1a1a1a" metalness={1} roughness={0.2} />
      </mesh>
      <group ref={ring2}>
        <mesh position={[2.3, 0, 0]}>
          <sphereGeometry args={[0.12, 32, 32]} />
          <meshStandardMaterial color="#d9d4c7" metalness={1} roughness={0.05} />
        </mesh>
        <mesh position={[-1.6, 0.9, 0.6]}>
          <sphereGeometry args={[0.07, 32, 32]} />
          <meshStandardMaterial color="#6e3519" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </group>
  )
}

export default function StudioScene({ s }) {
  return (
    <Stage>
      <Orb s={s} />
      <Sparkles count={70} scale={[12, 7, 4]} size={2.2} speed={0.3} color="#3a2a20" opacity={0.6} />
    </Stage>
  )
}
