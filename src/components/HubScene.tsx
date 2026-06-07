// ============================================================================
// HubScene.tsx — 「時空樞紐」沉浸式 hub：反射地板 + 星空 + 能量粒子 +
// 六道發光時光之門 + 中央時光電弧儀核心 + 懸浮探測機玩家。
// 玩家 WASD/方向鍵移動，走近時光之門按 E 或點擊進入。
// ============================================================================
import { useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  Html, Environment, Lightformer, MeshReflectorMaterial, Sparkles, Stars, Float,
} from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../store/store'
import { useKeyboard } from '../game/useKeyboard'
import { touch } from '../game/touch'
import { CHALLENGE_ORDER, CHALLENGES } from '../story/script'
import type { ChallengeId } from '../story/script'
import { DOOR_RADIUS } from '../theme'

interface DoorInfo { id: ChallengeId; pos: THREE.Vector3; color: string; title: string }

// ── 時光之門（拱框 + 旋轉能量漩渦 + 傳送面） ─────────────────────────────
function PortalGate({ pos, color, title, done, near, onEnter, showLabel = true }: {
  pos: THREE.Vector3; color: string; title: string; done: boolean; near: boolean; onEnter: () => void; showLabel?: boolean
}) {
  const swirl = useRef<THREE.Group>(null)
  const disc = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((st, dt) => {
    if (swirl.current) swirl.current.rotation.z += dt * 0.5
    if (disc.current) disc.current.emissiveIntensity = 0.6 + Math.sin(st.clock.elapsedTime * 2 + pos.x) * 0.25 + (near ? 0.8 : 0)
  })
  const facing = Math.atan2(pos.x, pos.z) + Math.PI
  const c = done ? '#34d399' : color
  return (
    <group position={[pos.x, 0, pos.z]} rotation={[0, facing, 0]}>
      {/* 底座 */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[1.7, 1.9, 0.3, 24]} />
        <meshStandardMaterial color="#10151f" metalness={0.7} roughness={0.4} envMapIntensity={1} />
      </mesh>
      {/* 外拱框 */}
      <mesh position={[0, 2.0, 0]} castShadow>
        <torusGeometry args={[1.55, 0.14, 20, 48]} />
        <meshStandardMaterial color="#1a2230" metalness={0.9} roughness={0.25} emissive={c} emissiveIntensity={near ? 0.9 : 0.35} envMapIntensity={1.2} />
      </mesh>
      {/* 旋轉能量漩渦（內層數環） */}
      <group ref={swirl} position={[0, 2.0, 0.02]}>
        {[1.25, 0.95, 0.62].map((r, i) => (
          <mesh key={i} rotation={[0, 0, i * 0.7]}>
            <torusGeometry args={[r, 0.03, 8, 40]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* 傳送面 */}
      <mesh position={[0, 2.0, 0]}>
        <circleGeometry args={[1.4, 48]} />
        <meshStandardMaterial ref={disc} color="#05080f" emissive={c} emissiveIntensity={0.6} transparent opacity={0.55} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* 互動命中區 */}
      <mesh position={[0, 1.9, 0]} onClick={(e) => { e.stopPropagation(); onEnter() }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'default')}>
        <circleGeometry args={[1.4, 24]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 2, 0.5]} color={c} intensity={near ? 14 : 6} distance={9} />
      {showLabel && (
        <Html position={[0, 3.7, 0]} center distanceFactor={15} occlude={false}>
          <div style={{
            whiteSpace: 'nowrap', padding: '4px 12px',
            background: 'rgba(8,12,22,0.82)', border: `1px solid ${c}`, borderRadius: 999,
            color: '#eaf2ff', font: "12px/1.4 system-ui,'Microsoft JhengHei',sans-serif",
            boxShadow: near ? `0 0 16px ${c}` : 'none', pointerEvents: 'none',
          }}>{done ? '✓ ' : '◇ '}{title}</div>
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
function Drone({ inner }: { inner: React.RefObject<THREE.Group | null> }) {
  const halo = useRef<THREE.Mesh>(null)
  useFrame((st, dt) => {
    if (halo.current) halo.current.rotation.y += dt * 1.5
    if (inner.current) inner.current.position.y = 1.1 + Math.sin(st.clock.elapsedTime * 2.5) * 0.12
  })
  return (
    <group ref={inner} position={[0, 1.1, 0]}>
      <mesh castShadow><icosahedronGeometry args={[0.34, 1]} /><meshStandardMaterial color="#cfd8e6" metalness={0.9} roughness={0.2} envMapIntensity={1.4} /></mesh>
      <mesh position={[0, 0, 0.3]}><sphereGeometry args={[0.1, 16, 16]} /><meshStandardMaterial color="#ffd36b" emissive="#ffae42" emissiveIntensity={2} toneMapped={false} /></mesh>
      <mesh ref={halo} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.55, 0.03, 10, 40]} /><meshStandardMaterial color="#5eead4" emissive="#5eead4" emissiveIntensity={1.4} toneMapped={false} /></mesh>
      <pointLight position={[0, 0.4, 0]} color="#bfe9ff" intensity={6} distance={6} />
    </group>
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
  const { solved, setScene, setNearDoor, nearDoor, allSolved, setDialogue } = useGame()
  const keys = useKeyboard()
  const player = useRef<THREE.Group>(null)
  const droneInner = useRef<THREE.Group>(null)
  const interactLatch = useRef(false)
  const { camera } = useThree()
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
    const SPEED = 6.5
    g.position.x += mx * SPEED * dt
    g.position.z += mz * SPEED * dt
    const R = 11.5
    const d = Math.hypot(g.position.x, g.position.z)
    if (d > R) { g.position.x *= R / d; g.position.z *= R / d }

    let best: ChallengeId | null = null
    let bestDist = Infinity
    for (const door of doors) { const dist = g.position.distanceTo(door.pos); if (dist < bestDist) { bestDist = dist; best = door.id } }
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

      <Environment resolution={256} frames={1}>
        <Lightformer intensity={1.6} position={[0, 8, -8]} scale={[14, 8, 1]} color="#9fd4ff" />
        <Lightformer intensity={1.0} position={[-8, 3, 4]} scale={[8, 8, 1]} color="#7c5cff" />
        <Lightformer intensity={1.0} position={[8, 3, 4]} scale={[8, 8, 1]} color="#ffce8a" />
      </Environment>

      <ambientLight intensity={0.25} />
      <hemisphereLight args={['#26406b', '#05070f', 0.5]} />
      <directionalLight position={[6, 12, 6]} intensity={0.6} castShadow shadow-mapSize={[2048, 2048]} />

      {/* 反射地板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 80]} />
        <MeshReflectorMaterial blur={[300, 90]} resolution={1024} mixBlur={1} mixStrength={28} roughness={0.85} depthScale={1.1} minDepthThreshold={0.4} maxDepthThreshold={1.3} color="#0a0f1c" metalness={0.65} mirror={0.45} />
      </mesh>
      {/* 中央發光環刻 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
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
              {allSolved
                ? '六項實驗都已重現、六張殘頁已收齊。回到中央光環，拼出那張紙條的真相吧。'
                : '走近任一道時光之門按 E（或點擊門）進入。重現六項歷史實驗，收集散落各年代的殘頁。'}
            </div>
          </Html>
        )}
      </group>

      {/* 六道時光之門 */}
      {doors.map((door) => (
        <PortalGate key={door.id} pos={door.pos} color={door.color} title={door.title}
          done={!!solved[door.id]} near={nearDoor === door.id} showLabel={!cinematic} onEnter={() => { if (!cinematic) setScene(door.id) }} />
      ))}

      {/* 常駐引導 NPC */}
      {!cinematic && <GuideCompanion onTalk={() => setDialogue({
        speaker: '時光導引體 AMP',
        accent: '#5eead4',
        lines: [
          '我是 AMP，時光電弧儀的導引體，會一路陪著你。',
          '任務：走進六道時光之門，重現歐姆、克希何夫、湯姆森、布勞恩、法拉第與變壓器時代的實驗。',
          '每重現一項實驗，我會出一道選擇題；答對就能取得那個年代的「殘頁」線索。',
          '集滿六張殘頁，回到中央光環，我們一起拼出那張神秘紙條的真相。',
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
