// ============================================================================
// lab.tsx — 真實「實驗室器材」3D 元件庫（給六關共用）。
// ============================================================================
import { useMemo, useRef, useState, type RefObject } from 'react'
import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

const COPPER = '#c0763a'
const BRASS = '#d8b24a'
const STEEL = '#8a939e'
const CERAMIC = '#ece5d6'
const PLASTIC = '#2b3340'

export function labelStyle(border: string): React.CSSProperties {
  return {
    padding: '1px 6px', background: 'rgba(255,255,255,0.92)', border: `1px solid ${border}`,
    borderRadius: 5, color: '#16202e', font: "700 12px/1.2 system-ui, 'Microsoft JhengHei', sans-serif",
    whiteSpace: 'nowrap', pointerEvents: 'none',
  }
}

// ── 絕緣導線 ─────────────────────────────────────────────────────────────
export function Lead({ points, color = '#d23b3b', r = 0.035 }: { points: [number, number, number][]; color?: string; r?: number }) {
  const geo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.3)
    return new THREE.TubeGeometry(c, Math.max(16, points.length * 10), r, 10, false)
  }, [points, r])
  return <mesh geometry={geo} castShadow><meshStandardMaterial color={color} roughness={0.55} metalness={0.1} /></mesh>
}

export function Post({ pos }: { pos: [number, number, number] }) {
  return (
    <mesh position={pos} castShadow>
      <cylinderGeometry args={[0.06, 0.07, 0.18, 12]} />
      <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
    </mesh>
  )
}

export function BatteryPack({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <mesh castShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[1.6, 0.7, 0.9]} />
        <meshStandardMaterial color="#21303f" metalness={0.3} roughness={0.6} />
      </mesh>
      <Post pos={[-0.5, 0.78, 0]} />
      <Post pos={[0.5, 0.78, 0]} />
      <Html position={[-0.5, 1.04, 0]} center distanceFactor={11}><div style={labelStyle('#d23b3b')}>＋</div></Html>
      <Html position={[0.5, 1.04, 0]} center distanceFactor={11}><div style={labelStyle('#222')}>－</div></Html>
      <Html position={[0, 0.35, 0.5]} center distanceFactor={13}><div style={labelStyle('#21303f')}>電池組</div></Html>
    </group>
  )
}

export function DialMeter({ pos, label = 'A', color = '#1f6feb', needleRef }: {
  pos: [number, number, number]; label?: string; color?: string; needleRef?: RefObject<THREE.Group | null>
}) {
  return (
    <group position={pos}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.22, 32]} />
        <meshStandardMaterial color="#0e1622" metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.12]}><circleGeometry args={[0.4, 32]} /><meshStandardMaterial color="#f4f1e7" /></mesh>
      <mesh position={[0, 0, 0.122]}><ringGeometry args={[0.38, 0.4, 32]} /><meshStandardMaterial color={color} /></mesh>
      <group ref={needleRef} position={[0, 0, 0.14]}>
        <mesh position={[0, 0.17, 0]}><boxGeometry args={[0.025, 0.34, 0.01]} /><meshStandardMaterial color="#c0392b" /></mesh>
      </group>
      <mesh position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.04, 12]} /><meshStandardMaterial color="#222" /></mesh>
      <Html position={[0, -0.22, 0.13]} center distanceFactor={10}><div style={labelStyle(color)}>{label}</div></Html>
    </group>
  )
}

// ── 陶瓷滑動變阻器（可選：滑塊可用滑鼠拖曳） ─────────────────────────────
export function Rheostat({ pos, frac, length = 1.8, onFrac, onDragState, label = '滑動變阻器 R' }: {
  pos: [number, number, number]; frac: number; length?: number
  onFrac?: (f: number) => void; onDragState?: (b: boolean) => void; label?: string
}) {
  const [drag, setDrag] = useState(false)
  const x = (frac - 0.5) * (length - 0.4)
  const draggable = !!onFrac

  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!drag) return
    e.stopPropagation()
    const f = Math.min(Math.max((e.point.x - pos[0]) / (length - 0.4) + 0.5, 0), 1)
    onFrac?.(f)
  }
  const end = () => { if (drag) { setDrag(false); onDragState?.(false) } }

  return (
    <group position={pos}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.18, 0.18, length, 20]} /><meshStandardMaterial color={CERAMIC} roughness={0.8} /></mesh>
      <mesh position={[0, 0.32, 0]}><boxGeometry args={[length, 0.05, 0.08]} /><meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[-length / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.22, 0.22, 0.12, 16]} /><meshStandardMaterial color={PLASTIC} /></mesh>
      <mesh position={[length / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.22, 0.22, 0.12, 16]} /><meshStandardMaterial color={PLASTIC} /></mesh>
      <Post pos={[-length / 2, 0.34, 0]} />
      {/* 滑塊（可拖） */}
      <group position={[x, 0.32, 0]}>
        <mesh
          castShadow
          onPointerDown={draggable ? (e) => { e.stopPropagation(); setDrag(true); onDragState?.(true) } : undefined}
          onPointerOver={draggable ? () => (document.body.style.cursor = 'grab') : undefined}
          onPointerOut={draggable ? () => (document.body.style.cursor = 'default') : undefined}
        >
          <boxGeometry args={[0.22, 0.34, 0.26]} />
          <meshStandardMaterial color={drag ? '#ffd36b' : STEEL} emissive={drag ? '#ffae42' : '#000'} emissiveIntensity={drag ? 0.5 : 0} metalness={0.6} roughness={0.35} />
        </mesh>
        <Post pos={[0, 0.3, 0]} />
      </group>
      {/* 拖曳時的捕捉平面 */}
      {drag && (
        <mesh position={[0, 0.3, 0]} onPointerMove={move} onPointerUp={end} onPointerLeave={end}>
          <planeGeometry args={[40, 20]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      <Html position={[0, -0.42, 0]} center distanceFactor={13}>
        <div style={labelStyle('#9a7b3a')}>{label}{draggable ? '（可拖曳滑塊）' : ''}</div>
      </Html>
    </group>
  )
}

export function ResistorUnit({ pos, label = 'R', glow = 0 }: { pos: [number, number, number]; label?: string; glow?: number }) {
  return (
    <group position={pos}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.16, 0.16, 0.7, 18]} /><meshStandardMaterial color="#cdb48c" roughness={0.7} emissive="#7a3b12" emissiveIntensity={glow} /></mesh>
      {[-0.12, 0, 0.12].map((b, i) => (
        <mesh key={i} position={[b, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.165, 0.165, 0.04, 18]} /><meshStandardMaterial color={['#7a3b12', '#c0392b', '#d4a017'][i]} /></mesh>
      ))}
      <Html position={[0, -0.3, 0]} center distanceFactor={13}><div style={labelStyle('#9a7b3a')}>{label}</div></Html>
    </group>
  )
}

// ── 燈泡（含點光源，真正發光），glassRef/lightRef 由關卡每幀調亮度 ─────────
export function BulbLamp({ pos, glassRef, lightRef, broken = false }: {
  pos: [number, number, number]; glassRef?: RefObject<THREE.MeshStandardMaterial | null>
  lightRef?: RefObject<THREE.PointLight | null>; broken?: boolean
}) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[0.3, 0.34, 0.24, 20]} /><meshStandardMaterial color={PLASTIC} /></mesh>
      <Post pos={[-0.18, 0.02, 0.2]} />
      <Post pos={[0.18, 0.02, 0.2]} />
      <mesh position={[0, 0.32, 0]}><cylinderGeometry args={[0.16, 0.18, 0.2, 16]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.34, 24, 24]} />
        <meshStandardMaterial ref={glassRef} color="#fff6d8" emissive="#ffcf66" emissiveIntensity={0.1} transparent opacity={0.72} roughness={0.1} />
      </mesh>
      {!broken && (
        <mesh position={[0, 0.6, 0]}><torusGeometry args={[0.09, 0.014, 8, 18]} /><meshStandardMaterial color="#ffd36b" emissive="#ff8a00" emissiveIntensity={1.6} /></mesh>
      )}
      <pointLight ref={lightRef} position={[0, 0.62, 0]} intensity={0} color="#ffd27a" distance={16} decay={2} />
    </group>
  )
}

export function CoilHelix({ pos = [0, 0, 0], axis = 'x', turns = 10, length = 2.2, radius = 0.5, tube = 0.05, color = COPPER, matRef }: {
  pos?: [number, number, number]; axis?: 'x' | 'y'; turns?: number; length?: number; radius?: number; tube?: number; color?: string
  matRef?: RefObject<THREE.MeshStandardMaterial | null>
}) {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const N = turns * 24
    for (let i = 0; i <= N; i++) {
      const tt = i / N, a = tt * turns * Math.PI * 2, along = (tt - 0.5) * length
      if (axis === 'x') pts.push(new THREE.Vector3(along, radius * Math.sin(a), radius * Math.cos(a)))
      else pts.push(new THREE.Vector3(radius * Math.cos(a), along, radius * Math.sin(a)))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N, tube, 8, false)
  }, [axis, turns, length, radius, tube])
  return <mesh geometry={geo} position={pos} castShadow><meshStandardMaterial ref={matRef} color={color} metalness={0.6} roughness={0.35} emissive={color} emissiveIntensity={0} /></mesh>
}

export function IronRod({ pos, axis = 'x', length = 2.6, radius = 0.28 }: { pos: [number, number, number]; axis?: 'x' | 'y'; length?: number; radius?: number }) {
  return (
    <mesh position={pos} rotation={axis === 'x' ? [0, 0, Math.PI / 2] : [0, 0, 0]} castShadow>
      <cylinderGeometry args={[radius, radius, length, 20]} />
      <meshStandardMaterial color={STEEL} metalness={0.85} roughness={0.3} />
    </mesh>
  )
}

export function BarMagnet({ pos, rot = [0, 0, 0], length = 1.8, w = 0.5, nFirst = true }: {
  pos: [number, number, number]; rot?: [number, number, number]; length?: number; w?: number; nFirst?: boolean
}) {
  return (
    <group position={pos} rotation={rot}>
      <mesh position={[-length / 4, 0, 0]} castShadow><boxGeometry args={[length / 2, w, w]} /><meshStandardMaterial color={nFirst ? '#d23b3b' : '#2f6fe0'} metalness={0.3} roughness={0.5} /></mesh>
      <mesh position={[length / 4, 0, 0]} castShadow><boxGeometry args={[length / 2, w, w]} /><meshStandardMaterial color={nFirst ? '#2f6fe0' : '#d23b3b'} metalness={0.3} roughness={0.5} /></mesh>
      <Html position={[-length / 4, 0, w / 2 + 0.05]} center distanceFactor={11}><div style={labelStyle('#fff')}>{nFirst ? 'N' : 'S'}</div></Html>
      <Html position={[length / 4, 0, w / 2 + 0.05]} center distanceFactor={11}><div style={labelStyle('#fff')}>{nFirst ? 'S' : 'N'}</div></Html>
    </group>
  )
}

export function SupplyBox({ pos, label = 'DC 電源', ac = false }: { pos: [number, number, number]; label?: string; ac?: boolean }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[1.8, 0.8, 1]} /><meshStandardMaterial color="#33404f" metalness={0.3} roughness={0.6} /></mesh>
      <mesh position={[-0.4, 0.55, 0.51]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.16, 0.16, 0.08, 20]} /><meshStandardMaterial color="#cbd2da" metalness={0.6} roughness={0.3} /></mesh>
      <Post pos={[0.45, 0.84, 0]} />
      <Post pos={[0.7, 0.84, 0]} />
      <Html position={[0, 0.4, 0.52]} center distanceFactor={12}><div style={labelStyle('#1f6feb')}>{ac ? '～ 交流電源' : label}</div></Html>
    </group>
  )
}

export function BusBar({ a, b }: { a: [number, number, number]; b: [number, number, number] }) {
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  const horizontal = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1])
  return (
    <mesh position={mid} castShadow>
      <boxGeometry args={horizontal ? [len, 0.08, 0.12] : [0.08, len, 0.12]} />
      <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
    </mesh>
  )
}

// ── 可拖曳旋鈕（拖曳粗調 + 滾輪微調），裝在儀器上手動調參 ─────────────────
function knobLabel(c: string): React.CSSProperties {
  return { whiteSpace: 'nowrap', padding: '2px 9px', background: 'rgba(8,12,22,0.88)', border: `1px solid ${c}`, borderRadius: 8, color: '#eaf2ff', font: "11px/1.3 var(--font-body)", pointerEvents: 'none' }
}
export function Knob({ pos, value, min, max, step, onChange, onDragState, label, unit = '', accent = '#5eead4', size = 0.5 }: {
  pos: [number, number, number]; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; onDragState?: (b: boolean) => void; label: string; unit?: string; accent?: string; size?: number
}) {
  const [drag, setDrag] = useState(false)
  const last = useRef(0)
  const cx = pos[0], cy = pos[1]
  const frac = Math.min(1, Math.max(0, (value - min) / (max - min)))
  const ang = (-0.75 + frac * 1.5) * Math.PI
  const norm = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
  const set = (v: number) => { const cl = Math.min(max, Math.max(min, v)); onChange(+(Math.round(cl / step) * step).toFixed(6)) }
  const down = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setDrag(true); last.current = Math.atan2(e.point.y - cy, e.point.x - cx); onDragState?.(true); document.body.style.cursor = 'grabbing' }
  const move = (e: ThreeEvent<PointerEvent>) => { if (!drag) return; e.stopPropagation(); const a = Math.atan2(e.point.y - cy, e.point.x - cx); const d = norm(a - last.current); last.current = a; set(value - (d / (2 * Math.PI)) * (max - min)) }
  const end = () => { if (drag) { setDrag(false); onDragState?.(false); document.body.style.cursor = 'default' } }
  return (
    <group position={pos}>
      {/* 底座 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.05]}><cylinderGeometry args={[size * 1.28, size * 1.32, 0.12, 28]} /><meshStandardMaterial color="#1b2230" metalness={0.6} roughness={0.45} /></mesh>
      {/* 刻度環 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.06]}><torusGeometry args={[size * 1.05, 0.025, 8, 40]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} toneMapped={false} /></mesh>
      {/* 旋鈕本體（繞圈拖曳） */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.12]}
        onPointerDown={down}
        onWheel={(e) => { e.stopPropagation(); set(value - Math.sign((e as unknown as WheelEvent).deltaY) * step) }}
        onPointerOver={() => (document.body.style.cursor = 'grab')}
        onPointerOut={() => { if (!drag) document.body.style.cursor = 'default' }} castShadow>
        <cylinderGeometry args={[size, size, 0.22, 30]} />
        <meshStandardMaterial color={drag ? '#3a4a63' : '#2a3447'} metalness={0.75} roughness={0.3} emissive={accent} emissiveIntensity={drag ? 0.5 : 0.16} />
      </mesh>
      {/* 指標 */}
      <group rotation={[0, 0, -ang]}>
        <mesh position={[0, size * 0.64, 0.25]}><boxGeometry args={[0.07, size * 0.5, 0.05]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.5} toneMapped={false} /></mesh>
      </group>
      {drag && (
        <mesh position={[0, 0, 0.6]} onPointerMove={move} onPointerUp={end} onPointerLeave={end}>
          <planeGeometry args={[100, 70]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      <Html position={[0, -size - 0.34, 0]} center distanceFactor={12} occlude={false}>
        <div style={knobLabel(accent)}>{label} {value.toFixed(step < 1 ? 2 : 0)}{unit}</div>
      </Html>
    </group>
  )
}

export const LAB_COLORS = { COPPER, BRASS, STEEL, CERAMIC }
