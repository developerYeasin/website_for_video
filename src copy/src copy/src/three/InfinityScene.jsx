import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

const MOBILE = typeof window !== 'undefined' && window.innerWidth < 760
const SCALE = 2                      // world units per unit of scroll distance
export const ZONE = 600              // scroll distance spent in each biome
export const START = ZONE * 0.3      // begin well inside the first biome, clear of the loop seam
const WZONE = ZONE * SCALE           // the same, in world units

// Biomes, visited in order and looped forever.
export const ZONES = [
  { name: 'Snow Peaks', words: ['Rise', 'Climb', 'Summit'], line: 'Every journey starts at the top of the world.',
    top: '#3b5c9e', horizon: '#f4c2a8', sun: [0.35, 0.16, -1], sunCol: '#ffd2a0', night: 0, cloud: 0.45 },
  { name: 'Green Valley', words: ['Grow', 'Flow', 'Thrive'], line: 'A river winds through hills that never end.',
    top: '#2c6fc4', horizon: '#c4e2ff', sun: [0.5, 0.65, -0.6], sunCol: '#fff4dc', night: 0, cloud: 0.55 },
  { name: 'Golden Desert', words: ['Endure', 'Shape', 'Shine'], line: 'Dunes rewritten by the wind, every second.',
    top: '#3f7fc7', horizon: '#f7dcae', sun: [-0.2, 0.75, -0.65], sunCol: '#fff0c8', night: 0, cloud: 0.08 },
  { name: 'Open Ocean', words: ['Drift', 'Dream', 'Horizon'], line: 'Nothing but water, light, and the sun going down.',
    top: '#28275a', horizon: '#ff8a4c', sun: [0, 0.05, -1], sunCol: '#ffae5c', night: 0, cloud: 0.5 },
  { name: 'Aurora Night', words: ['Wonder', 'Glow', 'Infinite'], line: 'When the sun is gone, the sky starts dancing.',
    top: '#02040d', horizon: '#0c1d38', sun: [-0.3, 0.35, -1], sunCol: '#7d97c9', night: 1, cloud: 0 },
]
const NZ = ZONES.length

export const zoneAt = d => Math.floor((((d % (ZONE * NZ)) + ZONE * NZ) % (ZONE * NZ)) / ZONE)

// World-space biome weight, 0..1, with long crossfades. Mirrors the GLSL `zw`.
const zw = (k, d) => {
  const L = WZONE * NZ, m = ((d % L) + L) % L, a = k * WZONE, b = a + WZONE
  let r = 0
  for (const x of [m - L, m, m + L]) r = Math.max(r, Math.min(Math.max((x - a + 90) / 180, 0), 1) * Math.min(Math.max((b - x + 90) / 180, 0), 1))
  return r
}
// Path of the valley the camera flies along. Mirrors the GLSL `center`.
const center = z => Math.sin(z * 0.006) * 25 + Math.sin(z * 0.0021) * 30

/* ---------------- shared GLSL ---------------- */
const NOISE = /* glsl */`
  vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy)); vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0); m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g; g.x = a0.x*x0.x + h.x*x0.y; g.yz = a0.yz*x12.xz + h.yz*x12.yw;
    return 130.0 * dot(m, g);
  }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a*snoise(p); p *= 2.03; a *= 0.5; } return s; }
  float ridged(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ float n = 1.0 - abs(snoise(p)); s += a*n*n; p *= 2.1; a *= 0.5; } return s; }
`
const COMMON = /* glsl */`
  uniform float uTime; uniform float uZone; uniform vec3 uCamPos;
  uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSunCol;
  uniform float uNight; uniform float uCloud;
  float zw(float k, float d){
    float L = uZone * ${NZ}.0; float m = mod(d, L); float a = k * uZone; float b = a + uZone; float r = 0.0;
    for (int j = -1; j <= 1; j++){ float x = m + float(j) * L; r = max(r, clamp((x - a + 90.0) / 180.0, 0.0, 1.0) * clamp((b - x + 90.0) / 180.0, 0.0, 1.0)); }
    return r;
  }
  float center(float z){ return sin(z * 0.006) * 25.0 + sin(z * 0.0021) * 30.0; }
  vec3 applyFog(vec3 col, vec3 wp){
    float d = distance(wp, uCamPos);
    float f = 1.0 - exp(-pow(d * 0.0026, 1.6));
    vec3 dir = normalize(wp - uCamPos);
    float s = pow(max(dot(dir, uSunDir), 0.0), 8.0);
    return mix(col, mix(uHorizon, uSunCol, s * 0.55), f);
  }
`

/* ---------------- terrain ---------------- */
const terrainVert = /* glsl */`
  ${NOISE}
  ${COMMON}
  uniform vec2 uOff;
  varying vec3 vWorld; varying vec3 vN; varying vec4 vWa; varying float vWb;
  float height(vec2 p, vec4 wa, float wb){
    float dx = abs(p.x - center(p.y));
    float valley = smoothstep(10.0, 60.0, dx);
    float h = 0.0;
    if (wa.x > 0.0) h += wa.x * (ridged(p * 0.012) * 95.0 * valley + fbm(p * 0.05) * 3.0 - 4.0);
    if (wa.y > 0.0) h += wa.y * ((fbm(p * 0.01) * 0.5 + 0.5) * 38.0 * valley + fbm(p * 0.06) * 2.0 - 2.5);
    if (wa.z > 0.0) h += wa.z * ((sin(p.x * 0.045 + fbm(p * 0.004) * 4.0) * 0.5 + 0.5) * 4.0 + fbm(p * 0.015) * 2.5 + 1.2 + valley * 16.0 * (fbm(p * 0.006) * 0.5 + 0.7));
    if (wa.w > 0.0) h += wa.w * (-18.0 + fbm(p * 0.02) * 6.0 + smoothstep(140.0, 260.0, dx) * (30.0 + fbm(p * 0.01) * 20.0));
    if (wb > 0.0) h += wb * (ridged(p * 0.02) * 42.0 * valley * smoothstep(-0.1, 0.4, fbm(p * 0.008)) - 1.0);
    float t = wa.x + wa.y + wa.z + wa.w + wb;
    return h / max(t, 0.0001);
  }
  void main(){
    vec3 p = position; p.xz += uOff;
    float d = -p.z;
    vec4 wa = vec4(zw(0.0, d), zw(1.0, d), zw(2.0, d), zw(3.0, d)); float wb = zw(4.0, d);
    float e = 1.6;
    float h = height(p.xz, wa, wb);
    float hx = height(p.xz + vec2(e, 0.0), wa, wb);
    float hz = height(p.xz + vec2(0.0, e), wa, wb);
    p.y = h;
    vN = normalize(vec3(h - hx, e, h - hz));
    vWorld = p; vWa = wa; vWb = wb;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`
const terrainFrag = /* glsl */`
  ${NOISE}
  ${COMMON}
  varying vec3 vWorld; varying vec3 vN; varying vec4 vWa; varying float vWb;
  void main(){
    vec3 n = normalize(vN); float slope = 1.0 - n.y; float h = vWorld.y;
    float nz = snoise(vWorld.xz * 0.08) * 0.5 + 0.5;
    float big = snoise(vWorld.xz * 0.01) * 0.5 + 0.5;

    vec3 cM = mix(vec3(0.34, 0.42, 0.26), vec3(0.52, 0.50, 0.49), smoothstep(3.0, 12.0, h));
    cM = mix(cM, vec3(0.38, 0.36, 0.35), smoothstep(0.3, 0.6, slope));
    cM = mix(cM, vec3(1.0, 1.0, 1.04), smoothstep(13.0, 22.0, h + nz * 8.0) * (1.0 - smoothstep(0.62, 0.85, slope)));

    vec3 cV = mix(vec3(0.19, 0.42, 0.13), vec3(0.36, 0.56, 0.17), nz * 0.6 + big * 0.4);
    cV = mix(cV, vec3(0.10, 0.27, 0.09), smoothstep(8.0, 22.0, h) * 0.75);
    cV = mix(cV, vec3(0.45, 0.40, 0.32), smoothstep(0.38, 0.62, slope));
    cV = mix(vec3(0.82, 0.75, 0.52), cV, smoothstep(0.2, 1.4, h));

    float rip = sin(vWorld.x * 0.9 + vWorld.z * 0.35 + snoise(vWorld.xz * 0.05) * 3.0) * 0.5 + 0.5;
    vec3 cD = mix(vec3(0.84, 0.58, 0.32), vec3(0.95, 0.74, 0.46), rip * 0.35 + nz * 0.35 + big * 0.3);
    cD = mix(cD, vec3(0.66, 0.40, 0.24), smoothstep(0.35, 0.65, slope));

    vec3 cO = mix(vec3(0.86, 0.78, 0.55), vec3(0.22, 0.47, 0.20), smoothstep(1.2, 5.0, h));
    cO = mix(cO, vec3(0.35, 0.33, 0.30), smoothstep(0.4, 0.7, slope));

    vec3 cI = mix(vec3(0.82, 0.90, 0.98), vec3(0.42, 0.50, 0.62), smoothstep(0.32, 0.62, slope));

    float t = vWa.x + vWa.y + vWa.z + vWa.w + vWb;
    vec3 col = (cM * vWa.x + cV * vWa.y + cD * vWa.z + cO * vWa.w + cI * vWb) / max(t, 0.0001);

    float diff = max(dot(n, uSunDir), 0.0);
    vec3 light = uTop * 0.4 + uHorizon * 0.3 + uSunCol * diff * 1.05;
    col *= light * mix(1.0, 0.45, uNight);
    gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
  }
`

/* ---------------- water ---------------- */
const waterVert = /* glsl */`
  ${COMMON}
  uniform vec2 uOff;
  varying vec3 vWorld; varying float vOcean; varying float vIce;
  void main(){
    vec3 p = position; p.xz += uOff;
    float d = -p.z;
    vOcean = zw(3.0, d); vIce = zw(4.0, d);
    p.y = (sin(p.x * 0.05 + uTime * 0.9) + sin(p.z * 0.07 - uTime * 1.1)) * (0.15 + vOcean * 0.9) * (1.0 - vIce);
    vWorld = p;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`
const waterFrag = /* glsl */`
  ${COMMON}
  varying vec3 vWorld; varying float vOcean; varying float vIce;
  void main(){
    vec2 p = vWorld.xz; float t = uTime;
    float amp = (0.6 + vOcean) * (1.0 - vIce * 0.85);
    vec2 g = vec2(0.0);
    g += vec2(cos(p.x * 0.05 + t * 0.9) * 0.05, cos(p.y * 0.07 - t * 1.1) * 0.07) * 0.9;
    g += vec2(cos(p.x * 0.31 + p.y * 0.2 + t * 2.1), cos(p.y * 0.27 - p.x * 0.15 + t * 1.7)) * 0.08;
    g += vec2(cos(p.x * 1.1 - p.y * 0.7 + t * 3.0), cos(p.y * 1.3 + p.x * 0.5 + t * 2.6)) * 0.03;
    vec3 n = normalize(vec3(-g.x * amp, 1.0, -g.y * amp));
    vec3 v = normalize(uCamPos - vWorld);
    float fres = pow(1.0 - max(dot(v, n), 0.0), 4.0);
    vec3 deep = mix(vec3(0.02, 0.17, 0.26), vec3(0.62, 0.76, 0.86), vIce);
    vec3 refl = mix(uHorizon, uTop, 0.35);
    vec3 col = mix(deep * (uTop * 0.6 + uSunCol * 0.4), refl, 0.25 + fres * 0.7);
    vec3 r = reflect(-v, n);
    col += uSunCol * pow(max(dot(r, uSunDir), 0.0), 220.0) * 6.0 * (1.0 - uNight * 0.6);
    col += uSunCol * pow(max(dot(r, uSunDir), 0.0), 18.0) * 0.25;
    gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
  }
`

/* ---------------- sky ---------------- */
const skyVert = /* glsl */`
  varying vec3 vDir;
  void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const skyFrag = /* glsl */`
  ${NOISE}
  ${COMMON}
  varying vec3 vDir;
  void main(){
    vec3 d = normalize(vDir);
    float y = max(d.y, 0.0);
    vec3 col = mix(uHorizon, uTop, pow(y, 0.45));
    float s = max(dot(d, uSunDir), 0.0);
    col += uSunCol * (pow(s, 900.0) * 18.0 + pow(s, 14.0) * 0.4 + pow(s, 3.0) * 0.12);
    if (d.y > 0.0) {
      vec2 uv = d.xz / (d.y + 0.12) * 1.4 + vec2(uTime * 0.006, -uCamPos.z * 0.0009);
      float c = smoothstep(0.05, 0.75, fbm(uv) * 0.5 + 0.5 + (uCloud - 0.5)) * uCloud * smoothstep(0.0, 0.18, d.y);
      vec3 cc = mix(vec3(1.0), uSunCol, 0.35) * (0.75 + 0.35 * pow(s, 4.0));
      col = mix(col, cc * mix(1.0, 0.25, uNight), clamp(c, 0.0, 1.0) * 0.85);
    }
    vec3 q = floor(d * 420.0);
    float st = fract(sin(dot(q, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
    col += step(0.9978, st) * uNight * smoothstep(0.02, 0.2, d.y) * (0.7 + 0.6 * sin(uTime * 3.0 + st * 50.0));
    float band = uNight * smoothstep(0.06, 0.22, d.y) * (1.0 - smoothstep(0.35, 0.75, d.y));
    float curtain = pow(0.5 + 0.5 * sin(d.x * 7.0 + fbm(vec2(d.x * 2.5, uTime * 0.06)) * 5.0), 5.0);
    float shimmer = 0.6 + 0.4 * fbm(vec2(d.x * 18.0, d.y * 4.0 - uTime * 0.3));
    col += mix(vec3(0.15, 1.0, 0.55), vec3(0.65, 0.25, 1.0), smoothstep(0.15, 0.55, d.y)) * band * curtain * shimmer * 1.3;
    gl_FragColor = vec4(col, 1.0);
  }
`

const flake = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas'); c.width = c.height = 32
  const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32)
  return new THREE.CanvasTexture(c)
})()

function Snow() {
  const ref = useRef()
  const N = MOBILE ? 1200 : 3000
  const geo = useMemo(() => {
    const p = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) p.set([(Math.random() - 0.5) * 120, Math.random() * 60, -Math.random() * 160], i * 3)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    return g
  }, [N])
  useFrame((st, dt) => {
    const cam = st.camera.position, a = geo.attributes.position.array
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] -= dt * (4 + (i % 7))
      a[i * 3] += Math.sin(st.clock.elapsedTime + i) * dt * 0.8
      if (a[i * 3 + 1] < -5) a[i * 3 + 1] += 60
    }
    geo.attributes.position.needsUpdate = true
    ref.current.position.set(cam.x, cam.y - 25, Math.round(cam.z / 160) * 160)
    const d = -cam.z
    ref.current.material.opacity = Math.min(1, zw(0, d) + zw(4, d)) * 0.9
    ref.current.visible = ref.current.material.opacity > 0.01
  })
  return (
    <group>
      <points ref={ref} geometry={geo} frustumCulled={false}>
        <pointsMaterial size={0.45} map={flake} color="#ffffff" transparent depthWrite={false} />
      </points>
    </group>
  )
}

function World({ dist, speed }) {
  const terrain = useRef(), water = useRef(), sky = useRef()
  const uni = useMemo(() => ({
    uTime: { value: 0 }, uZone: { value: WZONE }, uCamPos: { value: new THREE.Vector3() },
    uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 0.3, -1).normalize() }, uSunCol: { value: new THREE.Color() },
    uNight: { value: 0 }, uCloud: { value: 0 },
  }), [])
  const tOff = useMemo(() => ({ value: new THREE.Vector2() }), [])
  const wOff = useMemo(() => ({ value: new THREE.Vector2() }), [])
  const SEG_X = MOBILE ? 150 : 260, SEG_Z = MOBILE ? 220 : 390, W = 800, D = 1200
  const tGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(W, D, SEG_X, SEG_Z)
    g.rotateX(-Math.PI / 2); g.translate(0, 0, -D / 2 + 100)
    return g
  }, [SEG_X, SEG_Z])
  const wGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1600, 1600, MOBILE ? 80 : 160, MOBILE ? 80 : 160)
    g.rotateX(-Math.PI / 2); g.translate(0, 0, -700)
    return g
  }, [])
  const cell = useMemo(() => [W / SEG_X, D / SEG_Z], [SEG_X, SEG_Z])
  const tmp = useMemo(() => ({ top: new THREE.Color(), hor: new THREE.Color(), sc: new THREE.Color(), dir: new THREE.Vector3(), c: new THREE.Color() }), [])
  const look = useMemo(() => new THREE.Vector3(), [])

  useFrame((st, dt) => {
    const d = (dist.current + START) * SCALE
    const z = -d
    // camera follows the winding valley
    const cx = center(z)
    st.camera.position.set(cx + st.pointer.x * 4, 14 + Math.sin(d * 0.004) * 3 + st.pointer.y * 3, z)
    look.set(center(z - 70) + st.pointer.x * 10, 9 + st.pointer.y * 6, z - 70)
    st.camera.lookAt(look)
    st.camera.rotateZ((center(z - 40) - cx) * -0.004)
    st.camera.fov = THREE.MathUtils.damp(st.camera.fov, 58 + Math.min(Math.abs(speed.current), 40) * 0.5, 3, dt)
    st.camera.updateProjectionMatrix()

    // blend the biome atmospheres seen from the camera
    tmp.top.setRGB(0, 0, 0); tmp.hor.setRGB(0, 0, 0); tmp.sc.setRGB(0, 0, 0); tmp.dir.set(0, 0, 0)
    let tot = 0, night = 0, cloud = 0
    ZONES.forEach((zn, k) => {
      const w = zw(k, d); if (!w) return
      tot += w
      tmp.top.add(tmp.c.set(zn.top).multiplyScalar(w))
      tmp.hor.add(tmp.c.set(zn.horizon).multiplyScalar(w))
      tmp.sc.add(tmp.c.set(zn.sunCol).multiplyScalar(w))
      tmp.dir.add(new THREE.Vector3(...zn.sun).normalize().multiplyScalar(w))
      night += zn.night * w; cloud += zn.cloud * w
    })
    uni.uTop.value.copy(tmp.top.multiplyScalar(1 / tot))
    uni.uHorizon.value.copy(tmp.hor.multiplyScalar(1 / tot))
    uni.uSunCol.value.copy(tmp.sc.multiplyScalar(1 / tot))
    uni.uSunDir.value.copy(tmp.dir.normalize())
    uni.uNight.value = night / tot; uni.uCloud.value = cloud / tot
    uni.uTime.value = st.clock.elapsedTime
    uni.uCamPos.value.copy(st.camera.position)

    // terrain and water ride along with the camera, snapped to their grid so nothing swims
    tOff.value.set(Math.round(cx / cell[0]) * cell[0], Math.round(z / cell[1]) * cell[1])
    wOff.value.set(Math.round(cx / 10) * 10, Math.round(z / 10) * 10)
    sky.current.position.copy(st.camera.position)
  })

  return (
    <>
      <mesh ref={sky} frustumCulled={false} renderOrder={-1}>
        <sphereGeometry args={[1500, 48, 24]} />
        <shaderMaterial vertexShader={skyVert} fragmentShader={skyFrag} uniforms={uni} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh ref={terrain} geometry={tGeo} frustumCulled={false}>
        <shaderMaterial vertexShader={terrainVert} fragmentShader={terrainFrag} uniforms={{ ...uni, uOff: tOff }} />
      </mesh>
      <mesh ref={water} geometry={wGeo} frustumCulled={false}>
        <shaderMaterial vertexShader={waterVert} fragmentShader={waterFrag} uniforms={{ ...uni, uOff: wOff }} />
      </mesh>
      <Snow />
    </>
  )
}

export default function InfinityScene({ dist, speed }) {
  return (
    <Canvas className="gl" dpr={[1, MOBILE ? 1.2 : 1.5]} camera={{ fov: 58, near: 0.5, far: 3200 }} gl={{ antialias: true }}
      eventSource={document.getElementById('root')} eventPrefix="client">
      <World dist={dist} speed={speed} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.85} radius={0.8} />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  )
}
