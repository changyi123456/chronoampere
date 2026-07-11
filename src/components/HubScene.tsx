// ============================================================================
// HubScene.tsx — 「時空樞紐」沉浸式 hub：反射地板 + 星空 + 能量粒子 +
// 六道發光時光之門 + 中央時光電弧儀核心 + 懸浮探測機玩家。
// 玩家 WASD/方向鍵移動，走近時光之門按 E 或點擊進入。
// ============================================================================
import { useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  Html, Environment, Lightformer, MeshReflectorMaterial, Sparkles, Stars, Float, Trail,
} from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../store/store'
import { useKeyboard } from '../game/useKeyboard'
import { touch } from '../game/touch'
import { CHALLENGE_ORDER, CHALLENGES } from '../story/script'
import type { ChallengeId } from '../story/script'
import { DOOR_RADIUS } from '../theme'
import { EPISODES } from '../story/narrative'
import { nebulaTexture, circuitTexture, runeTexture } from './textures'

// 每道門楔石上的發光符文（對應該關物理主題）
const RUNES: Record<ChallengeId, string> = {
  lamp: 'Ω', split: 'Σ', cyclo: 'e', maglock: 'B', dynamo: 'Φ', xfmr: 'N',
}

interface DoorInfo { id: ChallengeId; pos: THREE.Vector3; color: string; title: string }

// ── 傳送門漩渦（單面 shader：極座標螺旋 + 噪聲 + 邊緣光暈，HDR 輸出餵 Bloom） ──
const SWIRL_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const SWIRL_FRAG = /* glsl */ `
uniform float uTime; uniform vec3 uColor; uniform float uBoost;
varying vec2 vUv;
// cheap value noise
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
void main(){
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;          // 0 中心 → 1 邊緣
  float a = atan(c.y, c.x);
  // 螺旋：角度隨半徑扭轉 + 時間旋轉
  float swirl = a + (1.0 - r) * 6.0 - uTime * 1.4;
  float bands = 0.5 + 0.5 * sin(swirl * 3.0 + noise(vec2(r * 6.0, a * 2.0) + uTime * 0.3) * 4.0);
  float n = noise(vec2(cos(a), sin(a)) * (2.5 + r * 4.0) + uTime * 0.5);
  // 中心深淵 + 邊緣亮環
  float core = smoothstep(0.0, 0.55, r);
  float rim  = smoothstep(0.78, 0.99, r) * 2.2;
  float glow = bands * 0.8 + n * 0.45;
  vec3 col = uColor * (glow * core + rim) * (1.2 + uBoost * 1.6);
  float alpha = clamp(0.25 + glow * 0.6 + rim * 0.4, 0.0, 1.0) * smoothstep(1.02, 0.92, r);
  gl_FragColor = vec4(col, alpha);
}
`
function SwirlDisc({ color, near }: { color: string; near: boolean }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uBoost: { value: 0 } },
    vertexShader: SWIRL_VERT, fragmentShader: SWIRL_FRAG,
  }), [color])
  useFrame((st, dt) => {
    mat.uniforms.uTime.value = st.clock.elapsedTime
    const b = mat.uniforms.uBoost
    b.value += ((near ? 1 : 0) - b.value) * Math.min(1, dt * 6)
  })
  return (
    <mesh position={[0, 2.0, 0]}>
      <circleGeometry args={[1.42, 64]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )
}

// ── 被吸入傳送門的能量粒子（沿螺線收束到漩渦面） ────────────────────────
function IntakeParticles({ color, near }: { color: string; near: boolean }) {
  const N = 30
  const data = useMemo(() => Array.from({ length: N }).map(() => ({
    a: Math.random() * Math.PI * 2,
    r: 0.4 + Math.random() * 2.2,
    sp: 0.5 + Math.random() * 0.7,
  })), [])
  const obj = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    const m = new THREE.PointsMaterial({ color, size: 0.07, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
    m.toneMapped = false
    return new THREE.Points(g, m)
  }, [color])
  useFrame((_, dt) => {
    const pos = obj.geometry.attributes.position.array as Float32Array
    const speed = near ? 2.1 : 1
    for (let i = 0; i < N; i++) {
      const d = data[i]
      d.r -= d.sp * dt * speed
      d.a += dt * (1.6 + (2.6 - d.r) * 1.2)
      if (d.r < 0.12) { d.r = 1.8 + Math.random() * 1.2; d.a = Math.random() * Math.PI * 2 }
      pos[i * 3] = Math.cos(d.a) * d.r
      pos[i * 3 + 1] = 2.0 + Math.sin(d.a) * d.r * 0.92
      pos[i * 3 + 2] = 0.16 + Math.sin(d.a * 2) * 0.05
    }
    obj.geometry.attributes.position.needsUpdate = true
  })
  return <primitive object={obj} />
}

// ── 時光之門（拱框 + 旋轉能量漩渦 + 傳送面） ─────────────────────────────
function PortalGate({ pos, color, title, rune, done, near, unlocked, onEnter, showLabel = true }: {
  pos: THREE.Vector3; color: string; title: string; rune: string; done: boolean; near: boolean; unlocked: boolean; onEnter: () => void; showLabel?: boolean
}) {
  const facing = Math.atan2(pos.x, pos.z) + Math.PI
  const c = unlocked ? (done ? '#34d399' : color) : '#334155'
  return (
    <group position={[pos.x, 0, pos.z]} rotation={[0, facing, 0]}>
      {/* 底座 */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[1.7, 1.9, 0.3, 24]} />
        <meshStandardMaterial color="#10151f" metalness={0.7} roughness={0.4} envMapIntensity={1} />
      </mesh>
      {/* 分段石碑環（12 段，段間留縫透出漩渦光） */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = ((i + 0.5) / 12) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 1.55, 2.0 + Math.sin(a) * 1.55, 0]} rotation={[0, 0, a]} castShadow>
            <boxGeometry args={[0.34, 0.6, 0.24]} />
            <meshStandardMaterial color="#1a2230" metalness={0.85} roughness={0.3} emissive={c} emissiveIntensity={near ? 0.8 : 0.28} envMapIntensity={1.2} />
          </mesh>
        )
      })}
      {/* 楔石（keystone）+ 發光符文 */}
      <group position={[0, 3.7, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.58, 0.52, 0.32]} />
          <meshStandardMaterial color="#222c3d" metalness={0.85} roughness={0.28} emissive={c} emissiveIntensity={near ? 0.5 : 0.18} />
        </mesh>
        <mesh position={[0, 0, 0.17]}>
          <planeGeometry args={[0.4, 0.4]} />
          <meshBasicMaterial map={runeTexture(rune, c)} transparent toneMapped={false} />
        </mesh>
      </group>
      {/* 被吸入的能量粒子流 */}
      {unlocked && <IntakeParticles color={c} near={near} />}
      {/* shader 漩渦傳送面（HDR 輸出 → Bloom 泛光） */}
      {unlocked
        ? <SwirlDisc color={c} near={near} />
        : <mesh position={[0, 2, 0]}><circleGeometry args={[1.4, 32]} /><meshStandardMaterial color="#07101d" roughness={0.9} /></mesh>}
      {/* 互動命中區 */}
      <mesh position={[0, 1.9, 0]} onClick={(e) => { e.stopPropagation(); if (unlocked) onEnter() }}
        onPointerOver={() => (document.body.style.cursor = unlocked ? 'pointer' : 'not-allowed')}
        onPointerOut={() => (document.body.style.cursor = 'default')}>
        <circleGeometry args={[1.4, 24]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 2, 0.5]} color={c} intensity={unlocked ? (near ? 14 : 6) : 0.8} distance={9} />
      {showLabel && (
        <Html position={[0, 4.3, 0]} center distanceFactor={15} occlude={false}>
          <div style={{
            whiteSpace: 'nowrap', padding: '4px 12px',
            background: 'rgba(8,12,22,0.82)', border: `1px solid ${c}`, borderRadius: 999,
            color: '#eaf2ff', font: "12px/1.4 system-ui,'Microsoft JhengHei',sans-serif",
            boxShadow: near ? `0 0 16px ${c}` : 'none', pointerEvents: 'none',
          }}>{unlocked ? (done ? '✓ ' : '◇ ') : '🔒 '}{title}</div>
        </Html>
      )}
    </group>
  )
}

// ── 中央時光電弧儀核心（旋轉陀螺環 + 能量核心） ─────────────────────────
function ChronoCore({ onClick }: { onClick: () => void }) {
  const r1 = useRef<THREE.Mesh>(null)
  const r2 = useRef<THREE.Mesh>(null)
  const r3 = useRef<THREE.Mesh>(null)
  const core = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((st, dt) => {
    if (r1.current) r1.current.rotation.x += dt * 0.6
    if (r2.current) r2.current.rotation.y += dt * 0.8
    if (r3.current) r3.current.rotation.z += dt * 0.4
    if (core.current) core.current.emissiveIntensity = 1.6 + Math.sin(st.clock.elapsedTime * 3) * 0.5
  })
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <group onClick={(e) => { e.stopPropagation(); onClick() }}>
        <mesh>
          <icosahedronGeometry args={[0.55, 2]} />
          <meshStandardMaterial ref={core} color="#7fe9ff" emissive="#38d0ff" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
        <mesh ref={r1}><torusGeometry args={[1.05, 0.035, 12, 64]} /><meshStandardMaterial color="#8be9ff" emissive="#38d0ff" emissiveIntensity={1.1} metalness={0.8} roughness={0.2} toneMapped={false} /></mesh>
        <mesh ref={r2}><torusGeometry args={[1.35, 0.03, 12, 64]} /><meshStandardMaterial color="#b9a8ff" emissive="#7c5cff" emissiveIntensity={1} metalness={0.8} roughness={0.2} toneMapped={false} /></mesh>
        <mesh ref={r3}><torusGeometry args={[1.65, 0.025, 12, 64]} /><meshStandardMaterial color="#ffd27a" emissive="#ffae42" emissiveIntensity={0.9} metalness={0.8} roughness={0.2} toneMapped={false} /></mesh>
        <pointLight color="#38d0ff" intensity={30} distance={16} />
        <Sparkles count={40} scale={4} size={3} speed={0.4} color="#9fe9ff" />
      </group>
    </Float>
  )
}

// ── 玩家：懸浮探測機 ─────────────────────────────────────────────────────
// 複合機身（殼體 + 前視窗 + 雙推進莢艙）+ 拖尾光帶 + 噴口脈動
function Drone({ inner }: { inner: React.RefObject<THREE.Group | null> }) {
  const halo = useRef<THREE.Mesh>(null)
  const exL = useRef<THREE.MeshStandardMaterial>(null)
  const exR = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((st, dt) => {
    if (halo.current) halo.current.rotation.y += dt * 1.5
    if (inner.current) inner.current.position.y = 1.1 + Math.sin(st.clock.elapsedTime * 2.5) * 0.12
    const pulse = 1.6 + Math.sin(st.clock.elapsedTime * 14) * 0.5
    if (exL.current) exL.current.emissiveIntensity = pulse
    if (exR.current) exR.current.emissiveIntensity = pulse
  })
  return (
    <Trail width={0.55} length={4.5} color={new THREE.Color('#2ea394')} attenuation={(t) => t * t}>
      <group ref={inner} position={[0, 1.1, 0]}>
        {/* 主殼（壓扁流線體） */}
        <mesh castShadow scale={[1, 0.72, 1.2]}>
          <sphereGeometry args={[0.32, 24, 18]} />
          <meshStandardMaterial color="#cfd8e6" metalness={0.9} roughness={0.22} envMapIntensity={1.5} />
        </mesh>
        {/* 前視窗 */}
        <mesh position={[0, 0.05, 0.3]} scale={[1, 0.7, 0.6]}>
          <sphereGeometry args={[0.14, 16, 12]} />
          <meshStandardMaterial color="#0a1a26" emissive="#38d0ff" emissiveIntensity={1.4} metalness={0.4} roughness={0.15} toneMapped={false} />
        </mesh>
        {/* 雙推進莢艙 + 噴口 */}
        {([-1, 1] as const).map((sd) => (
          <group key={sd} position={[sd * 0.36, -0.04, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh castShadow>
              <capsuleGeometry args={[0.085, 0.3, 6, 12]} />
              <meshStandardMaterial color="#9aa7bd" metalness={0.85} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.24, 0]}>
              <sphereGeometry args={[0.06, 10, 10]} />
              <meshStandardMaterial ref={sd < 0 ? exL : exR} color="#aef2ff" emissive="#38d0ff" emissiveIntensity={1.6} toneMapped={false} />
            </mesh>
          </group>
        ))}
        {/* 頂部訊號燈 */}
        <mesh position={[0, 0.26, -0.05]}><sphereGeometry args={[0.05, 10, 10]} /><meshStandardMaterial color="#ffd36b" emissive="#ffae42" emissiveIntensity={2} toneMapped={false} /></mesh>
        {/* 光環 */}
        <mesh ref={halo} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.55, 0.03, 10, 40]} /><meshStandardMaterial color="#5eead4" emissive="#5eead4" emissiveIntensity={1.4} toneMapped={false} /></mesh>
        <pointLight position={[0, 0.4, 0]} color="#bfe9ff" intensity={6} distance={6} />
      </group>
    </Trail>
  )
}

// ── 常駐引導 NPC：時光導引體 AMP（點我對話） ─────────────────────────────
function GuideCompanion({ onTalk }: { onTalk: () => void }) {
  const g = useRef<THREE.Group>(null)
  const halo = useRef<THREE.Mesh>(null)
  const ang = useRef(0)
  useFrame((st, dt) => {
    ang.current += dt * 0.25
    if (g.current) {
      g.current.position.x = Math.cos(ang.current) * 3.4
      g.current.position.z = Math.sin(ang.current) * 3.4
      g.current.position.y = 1.7 + Math.sin(st.clock.elapsedTime * 2) * 0.12
    }
    if (halo.current) halo.current.rotation.z += dt * 1.2
  })
  return (
    <group ref={g} position={[3.4, 1.7, 0]}>
      <mesh onClick={(e) => { e.stopPropagation(); onTalk() }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'default')} castShadow>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial color="#dfe9f5" metalness={0.6} roughness={0.25} envMapIntensity={1.4} />
      </mesh>
      {/* 面板 + 雙眼 */}
      <mesh position={[0, 0.03, 0.36]}>
        <circleGeometry args={[0.26, 24]} />
        <meshStandardMaterial color="#08111e" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[-0.09, 0.05, 0.4]}><sphereGeometry args={[0.05, 12, 12]} /><meshStandardMaterial color="#7fe9ff" emissive="#38d0ff" emissiveIntensity={2.4} toneMapped={false} /></mesh>
      <mesh position={[0.09, 0.05, 0.4]}><sphereGeometry args={[0.05, 12, 12]} /><meshStandardMaterial color="#7fe9ff" emissive="#38d0ff" emissiveIntensity={2.4} toneMapped={false} /></mesh>
      {/* 天線 */}
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.015, 0.015, 0.3, 8]} /><meshStandardMaterial color="#9aa7bd" metalness={0.8} /></mesh>
      <mesh position={[0, 0.68, 0]}><sphereGeometry args={[0.06, 12, 12]} /><meshStandardMaterial color="#ffd36b" emissive="#ffae42" emissiveIntensity={2.2} toneMapped={false} /></mesh>
      {/* 光環 */}
      <mesh ref={halo} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.62, 0.025, 10, 40]} /><meshStandardMaterial color="#5eead4" emissive="#5eead4" emissiveIntensity={1.3} toneMapped={false} /></mesh>
      <pointLight color="#aef" intensity={5} distance={5} />
      <Html position={[0, 1.0, 0]} center distanceFactor={15} occlude={false}>
        <div style={{ whiteSpace: 'nowrap', padding: '3px 10px', background: 'rgba(8,12,22,0.85)', border: '1px solid #5eead4', borderRadius: 999, color: '#eaf2ff', font: "11px/1.3 system-ui,'Microsoft JhengHei',sans-serif", pointerEvents: 'none' }}>AMP・點我對話</div>
      </Html>
    </group>
  )
}

export function HubScene({ cinematic = false }: { cinematic?: boolean }) {
  const { solved, fragmentCount, storyReady, currentAct, setScene, setNearDoor, nearDoor, setDialogue } = useGame()
  const keys = useKeyboard()
  const player = useRef<THREE.Group>(null)
  const droneInner = useRef<THREE.Group>(null)
  const vel = useRef(new THREE.Vector3())
  const bank = useRef(0)
  const interactLatch = useRef(false)
  const { camera, size } = useThree()
  const lowTier = size.width < 760
  const [npcOpen, setNpcOpen] = useState(true)

  const doors = useMemo<DoorInfo[]>(() =>
    CHALLENGE_ORDER.map((id, i) => {
      const a = (i / CHALLENGE_ORDER.length) * Math.PI * 2 - Math.PI / 2
      return { id, pos: new THREE.Vector3(Math.cos(a) * DOOR_RADIUS, 1, Math.sin(a) * DOOR_RADIUS), color: CHALLENGES[id].doorColor, title: CHALLENGES[id].title }
    }), [])

  useFrame((st, dt) => {
    if (cinematic) {
      const a = st.clock.elapsedTime * 0.12
      camera.position.set(Math.sin(a) * 12, 6.5, Math.cos(a) * 12)
      camera.lookAt(0, 1.6, 0)
      return
    }
    const g = player.current
    if (!g) return
    const k = keys.current
    // 合併鍵盤（離散）與觸控搖桿（類比）輸入
    let mx = (k.right ? 1 : 0) - (k.left ? 1 : 0) + touch.x
    let mz = (k.backward ? 1 : 0) - (k.forward ? 1 : 0) + touch.z
    const mag = Math.hypot(mx, mz)
    if (mag > 1) { mx /= mag; mz /= mag }
    // ── 二階阻尼移動（加速/慣性）+ 朝移動方向轉向 + 側傾（banking）──
    const SPEED = 6.5
    const ACCEL = 1 - Math.pow(0.002, dt) // 速度平滑係數
    vel.current.x += (mx * SPEED - vel.current.x) * ACCEL
    vel.current.z += (mz * SPEED - vel.current.z) * ACCEL
    g.position.x += vel.current.x * dt
    g.position.z += vel.current.z * dt
    const spd = Math.hypot(vel.current.x, vel.current.z)
    if (spd > 0.4) {
      const yaw = Math.atan2(vel.current.x, vel.current.z)
      let dy = yaw - g.rotation.y
      while (dy > Math.PI) dy -= Math.PI * 2
      while (dy < -Math.PI) dy += Math.PI * 2
      g.rotation.y += dy * Math.min(1, dt * 8)
      // 側傾：轉向越急、傾角越大（上限 ~14°）
      bank.current += (THREE.MathUtils.clamp(-dy * 2.2, -0.25, 0.25) - bank.current) * Math.min(1, dt * 6)
    } else {
      bank.current += (0 - bank.current) * Math.min(1, dt * 4)
    }
    g.rotation.z = bank.current
    // 前傾：依速度微微低頭
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, (spd / SPEED) * 0.12, Math.min(1, dt * 5))
    const R = 11.5
    const d = Math.hypot(g.position.x, g.position.z)
    if (d > R) { g.position.x *= R / d; g.position.z *= R / d }

    let best: ChallengeId | null = null
    let bestDist = Infinity
    for (const door of doors) {
      if (EPISODES[door.id].act > currentAct.id) continue
      const dist = g.position.distanceTo(door.pos)
      if (dist < bestDist) { bestDist = dist; best = door.id }
    }
    const near = bestDist < 2.6 ? best : null
    if (near !== nearDoor) setNearDoor(near)
    const interact = k.interact || touch.interact
    if (interact && !interactLatch.current && near) { interactLatch.current = true; setScene(near) }
    if (!interact) interactLatch.current = false

    const target = new THREE.Vector3(g.position.x, g.position.y + 7.5, g.position.z + 10)
    camera.position.lerp(target, 1 - Math.pow(0.0015, dt))
    camera.lookAt(g.position.x, g.position.y + 0.5, g.position.z)
  })

  return (
    <group>
      <color attach="background" args={['#04060d']} />
      <fog attach="fog" args={['#04060d', 16, 40]} />
      <Stars radius={90} depth={45} count={1600} factor={3.2} fade speed={0.4} />
      {/* 遠景星雲（天球內面，程序貼圖） */}
      <mesh>
        <sphereGeometry args={[100, 32, 24]} />
        <meshBasicMaterial map={nebulaTexture()} side={THREE.BackSide} transparent opacity={0.85} depthWrite={false} fog={false} />
      </mesh>

      <Environment resolution={lowTier ? 128 : 256} frames={1}>
        <Lightformer intensity={1.6} position={[0, 8, -8]} scale={[14, 8, 1]} color="#9fd4ff" />
        <Lightformer intensity={1.0} position={[-8, 3, 4]} scale={[8, 8, 1]} color="#7c5cff" />
        <Lightformer intensity={1.0} position={[8, 3, 4]} scale={[8, 8, 1]} color="#ffce8a" />
      </Environment>

      <ambientLight intensity={0.25} />
      <hemisphereLight args={['#26406b', '#05070f', 0.5]} />
      <directionalLight position={[6, 12, 6]} intensity={0.6} castShadow={!lowTier} shadow-mapSize={lowTier ? [512, 512] : [2048, 2048]} />

      {/* 反射地板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 80]} />
        {/* depthScale 深度模糊在部分 GPU 上會與後製互相干擾產生閃爍 → 移除 */}
        {lowTier
          ? <meshStandardMaterial color="#0a0f1c" roughness={0.86} metalness={0.5} />
          : <MeshReflectorMaterial blur={[300, 90]} resolution={1024} mixBlur={1} mixStrength={28} roughness={0.85} color="#0a0f1c" metalness={0.65} mirror={0.45} />}
      </mesh>
      {/* 時光電路盤（地板發光紋路，加法混合疊在反射地板上） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[13.6, 64]} />
        <meshBasicMaterial map={circuitTexture()} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* 中央發光環刻（抬高避免與反射地板 z-fighting） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[2.6, 2.85, 80]} />
        <meshStandardMaterial color="#5eead4" emissive="#5eead4" emissiveIntensity={1.6} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <Sparkles count={80} scale={[22, 6, 22]} position={[0, 3, 0]} size={2} speed={0.25} color="#9fd4ff" />

      {/* 中央核心 NPC */}
      <group position={[0, 2.0, 0]}>
        <ChronoCore onClick={() => setNpcOpen((o) => !o)} />
        {!cinematic && npcOpen && (
          <Html position={[0, 1.7, 0]} center distanceFactor={12} occlude={false}>
            <div style={{
              width: 240, padding: '11px 13px', background: 'rgba(6,10,20,0.92)',
              border: '1px solid #38bdf8', borderRadius: 12, color: '#eaf2ff',
              font: "13px/1.55 system-ui,'Microsoft JhengHei',sans-serif", textAlign: 'left', pointerEvents: 'none',
              boxShadow: '0 0 24px rgba(56,189,248,0.4)',
            }}>
              <b style={{ color: '#7fe9ff' }}>時光電弧儀・導航核心</b><br />
              {storyReady
                ? '六個模組與六段因果紀錄已同步。中央核心等待你的最終推理與授權。'
                : `${currentAct.title}：${currentAct.directive}（殘頁 ${fragmentCount}/6）`}
            </div>
          </Html>
        )}
      </group>

      {/* 六道時光之門 */}
      {doors.map((door) => (
        <PortalGate key={door.id} pos={door.pos} color={door.color} title={door.title} rune={RUNES[door.id]}
          done={!!solved[door.id]} near={nearDoor === door.id} unlocked={EPISODES[door.id].act <= currentAct.id} showLabel={!cinematic} onEnter={() => { if (!cinematic) setScene(door.id) }} />
      ))}

      {/* 常駐引導 NPC */}
      {!cinematic && <GuideCompanion onTalk={() => setDialogue({
        speaker: '時光導引體 AMP',
        accent: '#5eead4',
        lines: [
          '我是 AMP，時光電弧儀的導引體，會一路陪著你。',
          `${currentAct.title}：${currentAct.question}`,
          '每關先提交假說，再用實驗驗證。完成後，你必須親手留下那個年代會保存的紀錄。',
          '證據牆不只回答問題，也能檢定祕密學會、導師、穿越者與閉合迴圈等假說。',
          '移動：WASD／方向鍵；靠近門按 E 進入。隨時點我對話，或打開「任務日誌」查看進度。',
        ],
      })} />}

      {/* 玩家 */}
      {!cinematic && (
        <group ref={player} position={[0, 1.1, 4.5]}>
          <Drone inner={droneInner} />
              </group>
      )}
    </group>
  )
}
