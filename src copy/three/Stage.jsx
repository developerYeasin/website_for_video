import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'

export const damp = THREE.MathUtils.damp
export const clamp01 = v => Math.min(1, Math.max(0, v))

// Phones are too narrow for an object beside the text: hide it in side
// sections and drop it below the copy in the hero.
export function fitMobile(viewport, x, y, sc, id) {
  if (viewport.width >= 4) return [x, y, sc]
  if (id === 'hero') return [0, y - viewport.height * 0.3, sc * 0.85]
  if (Math.abs(x) > 0.5) return [x, -viewport.height, 0]
  return [x, y, sc]
}

// Fixed full-screen WebGL layer that sits behind the page content.
// Reflections come from in-scene light panels, so nothing is downloaded.
export default function Stage({ children, camera = { position: [0, 0, 7], fov: 35 }, lights = 'warm' }) {
  const warm = lights === 'warm'
  return (
    <Canvas
      className="gl"
      dpr={[1, Math.min(1.75, window.innerWidth < 760 ? 1.5 : 1.75)]}
      camera={camera}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => { gl.localClippingEnabled = true; gl.toneMapping = THREE.ACESFilmicToneMapping }}
      eventSource={document.getElementById('root')}
      eventPrefix="client"
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 5, 4]} intensity={2} color={warm ? '#ffe2b8' : '#ffffff'} />
        <directionalLight position={[-4, -2, -3]} intensity={0.8} color={warm ? '#d8a84a' : '#ffd0e0'} />
        {children}
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={4} position={[0, 4, -6]} scale={[12, 3, 1]} color={warm ? '#fff1d6' : '#ffffff'} />
          <Lightformer form="rect" intensity={2.5} position={[-6, 0, 2]} rotation-y={Math.PI / 2} scale={[10, 2, 1]} color={warm ? '#ffc880' : '#ffd6e4'} />
          <Lightformer form="rect" intensity={2.5} position={[6, 1, 2]} rotation-y={-Math.PI / 2} scale={[10, 2, 1]} />
          <Lightformer form="ring" intensity={3} position={[0, 0, 6]} scale={3} color={warm ? '#ffe0b0' : '#fff0f5'} />
        </Environment>
      </Suspense>
    </Canvas>
  )
}
