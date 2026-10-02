import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MeshTransmissionMaterial, Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing'
import * as THREE from 'three'

const MOBILE = typeof window !== 'undefined' && window.innerWidth < 760

// Camera rail: galaxy → tunnel → morphing particles → crystal → neon city → grid world → sun.
const MORPH = new THREE.Vector3(0, 0.5, -186)
const CRYSTAL = new THREE.Vector3(3, 0.5, -238)
const SUN = new THREE.Vector3(0, 9, -540)
const RAIL = new THREE.CatmullRomCurve3([
  [0, 16, 48], [0, 7, 22], [0, 0.5, 4], [0, 0, -16],
  [0, 0, -60], [0, 0, -110], [0, 0, -140],
  [0, 1, -158], [9, 1.5, -176], [9, 1.5, -196], [0, 1.5, -212],
  [-8, 0.8, -230], [-8, 1, -246], [0, 3, -266],
  [0, 4, -290], [0, 3, -320], [0, 2.5, -350],
  [0, 2.2, -390], [0, 2, -430], [0, 3.5, -465], [0, 5, -486],
].map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.2)

/* ---------------- galaxy ---------------- */
const galaxyVert = /* glsl */`
  uniform float uTime; uniform float uSize;
  attribute float aScale; attribute vec3 aColor;
  varying vec3 vColor;
  void main() {
    vec4 mp = modelMatrix * vec4(position, 1.0);
    float a = atan(mp.x, mp.z);
    float d = length(mp.xz);
    a += uTime * 0.6 / (d + 1.0);
    mp.x = sin(a) * d; mp.z = cos(a) * d;
    vec4 vp = viewMatrix * mp;
    gl_Position = projectionMatrix * vp;
    gl_PointSize = uSize * aScale * (1.0 / -vp.z);
    vColor = aColor;
  }`
const galaxyFrag = /* glsl */`
  varying vec3 vColor;
  void main() {
    float s = 1.0 - smoothstep(0.0, 0.5, distance(gl_PointCoord, vec2(0.5)));
    gl_FragColor = vec4(vColor * s * 1.6, s);
  }`

function Galaxy() {
  const mat = useRef()
  const geo = useMemo(() => {
    const N = MOBILE ? 22000 : 60000, ARMS = 4, R = 26
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sc = new Float32Array(N)
    const inner = new THREE.Color('#ff9a5a'), outer = new THREE.Color('#5a6bff'), c = new THREE.Color()
    for (let i = 0; i < N; i++) {
      const r = Math.pow(Math.random(), 1.6) * R
      const arm = ((i % ARMS) / ARMS) * Math.PI * 2
      const bend = r * 0.32
      const rnd = () => Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.45 * r
      pos[i * 3] = Math.cos(arm + bend) * r + rnd()
      pos[i * 3 + 1] = rnd() * 0.35
      pos[i * 3 + 2] = Math.sin(arm + bend) * r + rnd()
      c.copy(inner).lerp(outer, r / R)
      if (Math.random() < 0.04) c.set('#ff4fd8')
      c.toArray(col, i * 3)
      sc[i] = Math.random()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
    g.setAttribute('aScale', new THREE.BufferAttribute(sc, 1))
    return g
  }, [])
  useFrame(st => { mat.current.uniforms.uTime.value = st.clock.elapsedTime })
  return (
    <points geometry={geo} rotation={[0.25, 0, 0.1]}>
      <shaderMaterial ref={mat} vertexShader={galaxyVert} fragmentShader={galaxyFrag}
        uniforms={{ uTime: { value: 0 }, uSize: { value: 70 * Math.min(window.devicePixelRatio, 2) } }}
        transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

/* ---------------- neon tunnel ---------------- */
function Tunnel() {
  const rings = useRef([])
  const items = useMemo(() => Array.from({ length: 46 }, (_, i) => ({
    z: -20 - i * 2.6,
    color: new THREE.Color().setHSL(0.55 + i / 46 * 0.45, 1, 0.55).multiplyScalar(3),
    rot: i * 0.25,
  })), [])
  const streaks = useMemo(() => {
    const N = 700, p = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2, r = 2.2 + Math.random() * 2.2
      p.set([Math.cos(a) * r, Math.sin(a) * r, -20 - Math.random() * 120], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    return g
  }, [])
  const sref = useRef()
  useFrame((st, dt) => {
    const t = st.clock.elapsedTime
    rings.current.forEach((m, i) => {
      if (!m) return
      m.rotation.z = items[i].rot + t * (i % 2 ? 0.3 : -0.3)
      m.scale.setScalar(1 + Math.sin(t * 3 - i * 0.4) * 0.06)
    })
    const a = sref.current.geometry.attributes.position
    for (let i = 0; i < a.count; i++) {
      let z = a.getZ(i) + dt * 30
      if (z > -20) z -= 120
      a.setZ(i, z)
    }
    a.needsUpdate = true
  })
  return (
    <group>
      {items.map((it, i) => (
        <mesh key={i} ref={el => (rings.current[i] = el)} position={[0, 0, it.z]}>
          <torusGeometry args={[4.4, i % 3 === 0 ? 0.07 : 0.03, 8, i % 3 === 0 ? 6 : 64]} />
          <meshBasicMaterial color={it.color} toneMapped={false} />
        </mesh>
      ))}
      <points ref={sref} geometry={streaks}>
        <pointsMaterial size={0.06} color={new THREE.Color('#9fd8ff').multiplyScalar(2)} toneMapped={false} transparent opacity={0.8} />
      </points>
    </group>
  )
}

/* ---------------- morphing particles ---------------- */
const morphVert = /* glsl */`
  uniform float uTime; uniform float uMorph; uniform float uSize;
  attribute vec3 aB; attribute vec3 aC; attribute float aR;
  varying vec3 vColor;
  vec3 pal(float t) { return 0.5 + 0.5 * cos(6.2831 * (t + vec3(0.0, 0.33, 0.67))); }
  void main() {
    float m = uMorph * 2.0;
    vec3 p = m < 1.0 ? mix(position, aB, smoothstep(0.0, 1.0, m)) : mix(aB, aC, smoothstep(1.0, 2.0, m));
    float mid = sin(fract(m) * 3.1416);
    p += normalize(p + 0.001) * sin(uTime * 2.0 + aR * 12.0) * 0.25 * (0.3 + mid);
    vec4 vp = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * vp;
    gl_PointSize = uSize * (0.4 + aR) * (1.0 / -vp.z);
    vColor = pal(aR * 0.6 + uMorph * 0.8 + uTime * 0.05) * 1.6;
  }`
const morphFrag = /* glsl */`
  varying vec3 vColor;
  void main() {
    float s = 1.0 - smoothstep(0.1, 0.5, distance(gl_PointCoord, vec2(0.5)));
    gl_FragColor = vec4(vColor * s, s);
  }`

function Morph() {
  const mat = useRef(), g = useRef()
  const { camera } = useThree()
  const geo = useMemo(() => {
    const N = MOBILE ? 9000 : 20000
    const A = new Float32Array(N * 3), B = new Float32Array(N * 3), C = new Float32Array(N * 3), R = new Float32Array(N)
    const knot = new THREE.TorusKnotGeometry(4, 1.2, 400, 32, 2, 3).attributes.position
    const v = new THREE.Vector3()
    for (let i = 0; i < N; i++) {
      v.randomDirection().multiplyScalar(5)                       // sphere
      v.toArray(A, i * 3)
      const k = (Math.random() * knot.count) | 0                  // torus knot surface
      B.set([knot.getX(k), knot.getY(k), knot.getZ(k)], i * 3)
      const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 4.5   // flat ring
      C.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.4, Math.sin(a) * r], i * 3)
      R[i] = Math.random()
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(A, 3))
    geo.setAttribute('aB', new THREE.BufferAttribute(B, 3))
    geo.setAttribute('aC', new THREE.BufferAttribute(C, 3))
    geo.setAttribute('aR', new THREE.BufferAttribute(R, 1))
    return geo
  }, [])
  useFrame((st, dt) => {
    const u = mat.current.uniforms
    u.uTime.value = st.clock.elapsedTime
    // sphere → knot → ring as the camera circles past
    const target = THREE.MathUtils.clamp((-camera.position.z - 160) / 48, 0, 1)
    u.uMorph.value = THREE.MathUtils.damp(u.uMorph.value, target, 3, dt)
    g.current.rotation.y += dt * 0.15
    g.current.rotation.x = 0.4 + u.uMorph.value * 0.6
  })
  return (
    <group ref={g} position={MORPH}>
      <points geometry={geo}>
        <shaderMaterial ref={mat} vertexShader={morphVert} fragmentShader={morphFrag} transparent depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{ uTime: { value: 0 }, uMorph: { value: 0 }, uSize: { value: 55 * Math.min(window.devicePixelRatio, 2) } }} />
      </points>
    </group>
  )
}

/* ---------------- neon skyline ---------------- */
function City() {
  const bodies = useRef(), caps = useRef()
  const { camera } = useThree()
  const towers = useMemo(() => {
    const list = []
    for (let i = 0; i < (MOBILE ? 160 : 320); i++) {
      const side = Math.random() < 0.5 ? -1 : 1
      list.push({
        x: side * (5 + Math.pow(Math.random(), 0.7) * 40), z: -262 - Math.random() * 100,
        w: 1 + Math.random() * 2.2, h: 3 + Math.pow(Math.random(), 2) * 26,
        hue: Math.random() < 0.5 ? 0.53 : 0.88, d: Math.random(),
      })
    }
    return list
  }, [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colors = useMemo(() => {
    const arr = new Float32Array(towers.length * 3), c = new THREE.Color()
    towers.forEach((t, i) => c.setHSL(t.hue, 1, 0.6).multiplyScalar(3).toArray(arr, i * 3))
    return arr
  }, [towers])
  useFrame(st => {
    const cz = camera.position.z
    towers.forEach((t, i) => {
      // towers grow out of the ground as the camera approaches
      const rise = THREE.MathUtils.clamp((t.z - cz + 90) / 60, 0, 1)
      const h = Math.max(0.01, t.h * THREE.MathUtils.smoothstep(rise, 0, 1) * (0.92 + Math.sin(st.clock.elapsedTime * 1.5 + t.d * 9) * 0.08))
      dummy.position.set(t.x, -2.5 + h / 2, t.z); dummy.scale.set(t.w, h, t.w); dummy.updateMatrix()
      bodies.current.setMatrixAt(i, dummy.matrix)
      dummy.position.set(t.x, -2.5 + h, t.z); dummy.scale.set(t.w * 1.02, 0.12, t.w * 1.02); dummy.updateMatrix()
      caps.current.setMatrixAt(i, dummy.matrix)
    })
    bodies.current.instanceMatrix.needsUpdate = true
    caps.current.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <instancedMesh ref={bodies} args={[null, null, towers.length]} frustumCulled={false}>
        <boxGeometry />
        <meshStandardMaterial color="#0b0a1a" metalness={0.9} roughness={0.25} emissive="#1a0f3a" emissiveIntensity={0.6} />
      </instancedMesh>
      <instancedMesh ref={caps} args={[null, null, towers.length]} frustumCulled={false}>
        <boxGeometry />
        <instancedBufferAttribute attach="instanceColor" args={[colors, 3]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.52, -312]}>
        <planeGeometry args={[120, 110]} />
        <meshStandardMaterial color="#030208" metalness={0.6} roughness={0.6} />
      </mesh>
    </group>
  )
}

/* ---------------- glass crystal ---------------- */
function Crystal() {
  const g = useRef(), orbit = useRef()
  useFrame((st, dt) => {
    g.current.rotation.y += dt * 0.25
    g.current.rotation.x = Math.sin(st.clock.elapsedTime * 0.4) * 0.3
    orbit.current.rotation.y -= dt * 0.6
    orbit.current.rotation.z = Math.sin(st.clock.elapsedTime * 0.3) * 0.4
  })
  const glows = ['#ff3d9a', '#3dd6ff', '#ffd13d', '#8a5bff', '#3dff9e', '#ff7a3d']
  return (
    <group position={CRYSTAL}>
      <mesh position={[4, 0, -14]}>
        <torusGeometry args={[9, 0.12, 16, 160]} />
        <meshBasicMaterial color={new THREE.Color('#ff4fd8').multiplyScalar(3)} toneMapped={false} />
      </mesh>
      <mesh position={[4, 0, -16]}>
        <circleGeometry args={[8.5, 64]} />
        <meshBasicMaterial color={new THREE.Color('#3a1a7a')} toneMapped={false} />
      </mesh>
      <mesh ref={g} scale={4.2}>
        <icosahedronGeometry args={[1, 0]} />
        <MeshTransmissionMaterial samples={MOBILE ? 4 : 8} resolution={MOBILE ? 256 : 512} thickness={1.5} roughness={0.05}
          chromaticAberration={1} anisotropy={0.4} distortion={0.3} distortionScale={0.4} temporalDistortion={0.1}
          ior={1.5} backside backsideThickness={0.6} color="#ffffff" />
        <lineSegments>
          <edgesGeometry args={[new THREE.IcosahedronGeometry(1.005, 0)]} />
          <lineBasicMaterial color={new THREE.Color('#9fe8ff').multiplyScalar(3)} toneMapped={false} />
        </lineSegments>
      </mesh>
      <group ref={orbit}>
        {glows.map((c, i) => {
          const a = (i / glows.length) * Math.PI * 2
          return (
            <mesh key={c} position={[Math.cos(a) * 7, Math.sin(a * 2) * 1.5, Math.sin(a) * 7]}>
              <sphereGeometry args={[0.35, 24, 24]} />
              <meshBasicMaterial color={new THREE.Color(c).multiplyScalar(4)} toneMapped={false} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

/* ---------------- synthwave grid world ---------------- */
const gridVert = /* glsl */`
  uniform float uTime; varying vec2 vUv; varying float vH; varying vec3 vW;
  void main() {
    vUv = uv;
    vec3 p = position;
    float side = smoothstep(4.0, 18.0, abs(p.x));
    float h = (sin(p.x * 0.25 + uTime * 0.6) * 1.6 + sin(p.y * 0.18 - uTime * 0.8) * 2.2 + sin((p.x + p.y) * 0.4) * 0.8) * side;
    h += side * side * 6.0 * (0.5 + 0.5 * sin(p.y * 0.05));
    p.z += h; vH = h;
    vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`
const gridFrag = /* glsl */`
  uniform float uTime; uniform vec3 uCam; varying vec2 vUv; varying float vH; varying vec3 vW;
  void main() {
    vec2 c = abs(fract(vUv * vec2(60.0, 80.0)) - 0.5);
    float edge = 0.5 - max(c.x, c.y);
    float line = 1.0 - smoothstep(0.0, 0.05, edge);
    vec3 col = mix(vec3(0.0, 0.85, 1.0), vec3(1.0, 0.2, 0.8), clamp(vH / 8.0, 0.0, 1.0));
    float fade = 1.0 - smoothstep(30.0, 110.0, distance(vW, uCam));
    vec3 bg = vec3(0.016, 0.008, 0.04);
    vec3 base = vec3(0.03, 0.0, 0.08);
    gl_FragColor = vec4(mix(bg, base + col * line * 1.15, fade), 1.0);
  }`

function GridWorld() {
  const mat = useRef()
  const mesh = useRef()
  const frames = useRef(0)
  const { camera } = useThree()
  useFrame(st => {
    // The program compiled during the first frames (while the crystal's
    // transmission pass is warming up) renders the grid as a flat haze;
    // a fresh copy compiled once the scene is running renders correctly.
    if (++frames.current === 30) {
      const fresh = mat.current.clone()
      fresh.uniforms = mat.current.uniforms
      mesh.current.material = fresh
      mat.current = fresh
    }
    mat.current.uniforms.uTime.value = st.clock.elapsedTime
    mat.current.uniforms.uCam.value.copy(camera.position)
  })
  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, -452]}>
      <planeGeometry args={[140, 180, MOBILE ? 120 : 220, MOBILE ? 140 : 260]} />
      <shaderMaterial ref={mat} vertexShader={gridVert} fragmentShader={gridFrag} side={THREE.DoubleSide}
        uniforms={{ uTime: { value: 0 }, uCam: { value: new THREE.Vector3() } }} />
    </mesh>
  )
}

const sunFrag = /* glsl */`
  uniform float uTime; varying vec2 vUv;
  void main() {
    float y = vUv.y;
    float bands = step(0.5, fract(y * 18.0 - uTime * 0.4));
    if (y < 0.48 && bands < 0.5) discard;
    vec3 col = mix(vec3(1.0, 0.15, 0.55), vec3(1.0, 0.85, 0.25), y);
    gl_FragColor = vec4(col * 2.4, 1.0);
  }`
const sunVert = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`

function Sun() {
  const mat = useRef()
  useFrame(st => { mat.current.uniforms.uTime.value = st.clock.elapsedTime })
  return (
    <mesh position={SUN}>
      <circleGeometry args={[22, 96]} />
      <shaderMaterial ref={mat} vertexShader={sunVert} fragmentShader={sunFrag} uniforms={{ uTime: { value: 0 } }} toneMapped={false} />
    </mesh>
  )
}

function Stars() {
  const geo = useMemo(() => {
    const N = 4500, p = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(260 + Math.random() * 260)
      v.z -= 260
      v.toArray(p, i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    return g
  }, [])
  return <points geometry={geo}><pointsMaterial size={0.7} color="#ffffff" sizeAttenuation transparent opacity={0.7} /></points>
}

/* ---------------- camera rig ---------------- */
function Rig({ progress }) {
  const t = useRef(0)
  const look = useMemo(() => new THREE.Vector3(), [])
  const pos = useMemo(() => new THREE.Vector3(), [])
  useFrame((st, dt) => {
    t.current = THREE.MathUtils.damp(t.current, progress.current, 3.5, dt)
    const u = Math.min(0.999, Math.max(0, t.current))
    RAIL.getPointAt(u, pos)
    RAIL.getPointAt(Math.min(1, u + 0.012), look)
    if (u < 0.08) look.lerp(new THREE.Vector3(0, 0, 0), 1 - u / 0.08)
    for (const [c, r] of [[MORPH, 36], [CRYSTAL, 34]]) {
      const near = 1 - Math.min(1, Math.abs(pos.z - c.z) / r)
      if (near > 0) look.lerp(c, near * 0.9)
    }
    if (u > 0.92) look.lerp(SUN, (u - 0.92) / 0.08)
    st.camera.position.set(pos.x + st.pointer.x * 0.8, pos.y + st.pointer.y * 0.5, pos.z)
    st.camera.lookAt(look)
    // banking roll while in the tunnel
    if (pos.z < -20 && pos.z > -140) st.camera.rotateZ(Math.sin(st.clock.elapsedTime * 0.5) * 0.08 + st.pointer.x * 0.1)
  })
  return null
}

export default function AetherScene({ progress }) {
  return (
    <Canvas className="gl aether-gl" dpr={[1, MOBILE ? 1.25 : 1.6]} camera={{ fov: 60, near: 0.1, far: 900, position: [0, 16, 48] }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      eventSource={document.getElementById("root")} eventPrefix="client">
      <color attach="background" args={['#04020a']} />
      <Stars />
      <Galaxy />
      <Tunnel />
      <Morph />
      <Crystal />
      <City />
      <GridWorld />
      <Sun />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={6} position={[0, 5, -5]} scale={[10, 2, 1]} color="#ff4fd8" />
        <Lightformer form="rect" intensity={6} position={[0, -5, 5]} scale={[10, 2, 1]} color="#3dd6ff" />
      </Environment>
      <Rig progress={progress} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={1.3} luminanceThreshold={0.25} luminanceSmoothing={0.3} radius={0.75} />
        <ChromaticAberration offset={[0.0007, 0.0007]} />
        <Noise opacity={0.06} />
        <Vignette eskil={false} offset={0.2} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  )
}
