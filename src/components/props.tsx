// ============================================================================
// props.tsx — 年代道具庫（全 primitive + 程序貼圖，零外部資源）。
//   Blackboard：黑板 + 粉筆公式（每關一塊，年代敘事 × 物理教學）
//   EraProps：依關卡 id 自動擺放 2–3 件年代道具（由 RoomShell 呼叫）
// ============================================================================
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { ChallengeId } from '../story/script'
import { blackboardTexture, paperTexture } from './textures'

// 每關黑板上的粉筆公式
export const ERA_FORMULAS: Record<ChallengeId, string[]> = {
  lamp: ['V = I · R', 'P = I²R', 'R(T) = R₀(1+αΔT)'],
  split: ['Σ I_in = Σ I_out', '1/R = 1/R₁ + 1/R₂'],
  cyclo: ['r = mv / eB', 'e/m = 2V / B²r²'],
  maglock: ['F = qE + qv×B', 'y = ½ a t²'],
  dynamo: ['ε = −dΦ/dt', 'ε_max = N B A ω'],
  xfmr: ['V₂/V₁ = N₂/N₁', 'P₁ = P₂'],
}

const WOOD_DARK = '#3a2a18'
const PAPER = '#e6dabb'
const BRASS = '#d8b24a'

// ── 黑板（木框 + 粉筆公式 + 粉筆槽） ─────────────────────────────────────
export function Blackboard({ era, pos = [4.8, 4.6, -6.86] }: { era: ChallengeId; pos?: [number, number, number] }) {
  const tex = useMemo(() => blackboardTexture(ERA_FORMULAS[era]), [era])
  return (
    <group position={pos} rotation={[0, 0, 0.012]}>
      {/* 板面 */}
      <mesh>
        <planeGeometry args={[3.4, 2.1]} />
        <meshStandardMaterial map={tex} roughness={0.92} />
      </mesh>
      {/* 木框 */}
      {([[0, 1.11, 3.6, 0.12], [0, -1.11, 3.6, 0.12]] as const).map(([x, y, ww, hh], i) => (
        <mesh key={'h' + i} position={[x, y, 0.02]}><boxGeometry args={[ww, hh, 0.08]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.8} /></mesh>
      ))}
      {([[-1.76, 0], [1.76, 0]] as const).map(([x, y], i) => (
        <mesh key={'v' + i} position={[x, y, 0.02]}><boxGeometry args={[0.12, 2.34, 0.08]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.8} /></mesh>
      ))}
      {/* 粉筆槽 + 粉筆 */}
      <mesh position={[0, -1.26, 0.1]}><boxGeometry args={[2.4, 0.07, 0.16]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.8} /></mesh>
      <mesh position={[-0.5, -1.21, 0.12]} rotation={[0, 0.5, Math.PI / 2]}><cylinderGeometry args={[0.022, 0.022, 0.3, 8]} /><meshStandardMaterial color="#f2f3ee" roughness={0.9} /></mesh>
    </group>
  )
}

// ── 通用小道具 ───────────────────────────────────────────────────────────
function BookStack({ pos }: { pos: [number, number, number] }) {
  const books: [string, number, number][] = [
    ['#6e3b2c', 0.9, 0.12], ['#33414c', 0.82, 0.1], ['#7a5a33', 0.95, 0.14], ['#4a3b52', 0.7, 0.1], ['#5a4a32', 0.85, 0.12],
  ]
  let y = 0
  return (
    <group position={pos}>
      {books.map(([c, wdt, hgt], i) => {
        y += hgt
        return (
          <RoundedBox key={i} args={[wdt, hgt, 0.62]} radius={0.02} position={[(Math.sin(i * 2.7)) * 0.07, y - hgt / 2, Math.cos(i * 1.9) * 0.05]} rotation={[0, (Math.sin(i * 3.1)) * 0.3, 0]} castShadow>
            <meshStandardMaterial color={c} roughness={0.75} />
          </RoundedBox>
        )
      })}
    </group>
  )
}

function QuillInk({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      {/* 墨水瓶 */}
      <mesh position={[0, 0.1, 0]} castShadow><cylinderGeometry args={[0.11, 0.14, 0.2, 12]} /><meshStandardMaterial color="#1c2430" roughness={0.2} metalness={0.1} /></mesh>
      <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.05, 0.06, 0.05, 10]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} /></mesh>
      {/* 羽毛筆（斜插） */}
      <mesh position={[0.06, 0.42, 0]} rotation={[0.15, 0, -0.5]}><coneGeometry args={[0.035, 0.62, 6]} /><meshStandardMaterial color="#e9e4d8" roughness={0.9} side={THREE.DoubleSide} /></mesh>
    </group>
  )
}

function Scrolls({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos} rotation={[0, 0.4, 0]}>
      {([[0, 0.07, 0], [0.16, 0.07, 0.05], [0.08, 0.2, 0.02]] as const).map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.7, 10]} />
          <meshStandardMaterial color={PAPER} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function OilLamp({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <mesh position={[0, -0.1, -0.06]}><boxGeometry args={[0.08, 0.5, 0.06]} /><meshStandardMaterial color="#22282f" metalness={0.7} roughness={0.4} /></mesh>
      <mesh position={[0, 0.02, 0.06]}><cylinderGeometry args={[0.09, 0.12, 0.16, 10]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>
      <mesh position={[0, 0.2, 0.06]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color="#ffd9a0" emissive="#ff9a2a" emissiveIntensity={1.6} transparent opacity={0.85} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Cabinet({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <RoundedBox args={[1.5, 2.3, 0.6]} radius={0.03} position={[0, 1.15, 0]} castShadow>
        <meshStandardMaterial color="#2c2418" roughness={0.8} />
      </RoundedBox>
      {/* 門縫 + 把手 */}
      <mesh position={[0, 1.15, 0.31]}><boxGeometry args={[0.02, 2.1, 0.01]} /><meshStandardMaterial color="#120d07" /></mesh>
      {([[-0.12], [0.12]] as const).map(([x], i) => (
        <mesh key={i} position={[x, 1.15, 0.33]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} /></mesh>
      ))}
    </group>
  )
}

function SpareBulbTube({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.3, 0.34, 0.12, 16]} /><meshStandardMaterial color="#2c2418" roughness={0.8} /></mesh>
      <mesh position={[0, 0.45, 0]} castShadow>
        <sphereGeometry args={[0.26, 20, 20]} />
        <meshPhysicalMaterial color="#dfeeff" transmission={0.95} thickness={0.3} roughness={0.06} ior={1.45} />
      </mesh>
    </group>
  )
}

function DarkroomLamp({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.16, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.22, 0.24, 12, 1, true]} /><meshStandardMaterial color="#1a1410" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.06, 0]}><sphereGeometry args={[0.09, 10, 10]} /><meshStandardMaterial color="#ff5544" emissive="#ff2211" emissiveIntensity={2.2} toneMapped={false} /></mesh>
      <pointLight position={[0, -0.1, 0]} color="#ff3322" intensity={2.6} distance={7} decay={2} />
      <mesh position={[0, 0.34, 0]}><cylinderGeometry args={[0.015, 0.015, 0.3, 6]} /><meshStandardMaterial color="#222" /></mesh>
    </group>
  )
}

function Curtain({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <mesh rotation={[0, 0.25, 0]}>
        <planeGeometry args={[2.2, 4.4, 8, 1]} />
        <meshStandardMaterial color="#15100c" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.26, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.03, 0.03, 2.4, 8]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.4} /></mesh>
    </group>
  )
}

function BrickArch({ pos }: { pos: [number, number, number] }) {
  const N = 11
  return (
    <group position={pos}>
      {Array.from({ length: N }).map((_, i) => {
        const a = (i / (N - 1)) * Math.PI
        return (
          <mesh key={i} position={[Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0]} rotation={[0, 0, a + Math.PI / 2]} castShadow>
            <boxGeometry args={[0.62, 0.34, 0.4]} />
            <meshStandardMaterial color={i % 2 ? '#5e3a28' : '#54331f'} roughness={0.95} />
          </mesh>
        )
      })}
      {/* 兩側磚柱 */}
      {([-2.2, 2.2] as const).map((x) => (
        <mesh key={x} position={[x, -1.4, 0]} castShadow><boxGeometry args={[0.5, 2.8, 0.42]} /><meshStandardMaterial color="#54331f" roughness={0.95} /></mesh>
      ))}
    </group>
  )
}

function HangingChain({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[0, -i * 0.22, 0]} rotation={[i % 2 ? Math.PI / 2 : 0, 0, i % 2 ? 0 : Math.PI / 2]}>
          <torusGeometry args={[0.085, 0.022, 8, 16]} />
          <meshStandardMaterial color="#4a4f57" metalness={0.85} roughness={0.45} />
        </mesh>
      ))}
    </group>
  )
}

function OpenDiary({ pos }: { pos: [number, number, number] }) {
  const tex = useMemo(() => paperTexture(), [])
  return (
    <group position={pos} rotation={[0, -0.5, 0]}>
      {([-1, 1] as const).map((s) => (
        <mesh key={s} position={[s * 0.27, 0.03, 0]} rotation={[-Math.PI / 2, 0, s * 0.06]}>
          <planeGeometry args={[0.54, 0.74]} />
          <meshStandardMaterial map={tex} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.06, 0.76]} /><meshStandardMaterial color="#3a2616" /></mesh>
    </group>
  )
}

function SteamPipe({ pos, len = 10 }: { pos: [number, number, number]; len?: number }) {
  return (
    <group position={pos}>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.16, 0.16, len, 12]} /><meshStandardMaterial color="#3c4047" metalness={0.85} roughness={0.45} /></mesh>
      {[-len * 0.32, 0, len * 0.32].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.23, 0.23, 0.1, 12]} />
          <meshStandardMaterial color="#2d3138" metalness={0.85} roughness={0.4} />
        </mesh>
      ))}
      {/* 垂直支管 */}
      <mesh position={[len * 0.18, -0.9, 0]}><cylinderGeometry args={[0.12, 0.12, 1.8, 10]} /><meshStandardMaterial color="#3c4047" metalness={0.85} roughness={0.45} /></mesh>
    </group>
  )
}

function FactoryLamp({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.02, 0.02, 1, 6]} /><meshStandardMaterial color="#222" /></mesh>
      <mesh rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.34, 0.26, 14, 1, true]} /><meshStandardMaterial color="#243028" metalness={0.7} roughness={0.4} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, -0.08, 0]}><sphereGeometry args={[0.1, 10, 10]} /><meshStandardMaterial color="#ffd9a0" emissive="#ffae42" emissiveIntensity={1.8} toneMapped={false} /></mesh>
    </group>
  )
}

// ── 年代道具總成（RoomShell 依 era 呼叫） ────────────────────────────────
export function EraProps({ era }: { era: ChallengeId }) {
  switch (era) {
    case 'lamp': // 1827 書房：書堆、羽毛筆墨水、卷軸
      return (
        <group>
          <BookStack pos={[-6.2, 0, -2.6]} />
          <QuillInk pos={[5.6, 0, -2.2]} />
          <Scrolls pos={[6.8, 0, -2.8]} />
        </group>
      )
    case 'split': // 1845 書齋：壁掛油燈、卷軸、書堆
      return (
        <group>
          <OilLamp pos={[6.9, 4.2, -6.78]} />
          <OilLamp pos={[-2.2, 4.2, -6.78]} />
          <Scrolls pos={[-6.4, 0, -2.4]} />
          <BookStack pos={[6.4, 0, -2.8]} />
        </group>
      )
    case 'cyclo': // 1897 卡文迪西：木櫃、備用真空球管
      return (
        <group>
          <Cabinet pos={[-7.6, 0, -4.5]} />
          <SpareBulbTube pos={[-7.6, 2.32, -4.3]} />
          <BookStack pos={[6.6, 0, -3]} />
        </group>
      )
    case 'maglock': // 1897 暗室：暗房紅燈、掛簾
      return (
        <group>
          <DarkroomLamp pos={[-5.5, 6.4, -3]} />
          <Curtain pos={[-8.6, 2.2, -2]} />
          <Cabinet pos={[7.6, 0, -4.6]} />
        </group>
      )
    case 'dynamo': // 1831 地下室：磚拱、鐵鏈、法拉第日記
      return (
        <group>
          <BrickArch pos={[-6.8, 2.8, -6.6]} />
          <HangingChain pos={[5.5, 7.6, -2.5]} />
          <OpenDiary pos={[-5.8, 0, 2.3]} />
        </group>
      )
    case 'xfmr': // 1885 工廠：蒸汽管、工廠吊燈、鉚釘樑
      return (
        <group>
          <SteamPipe pos={[0, 8.6, -3.5]} len={14} />
          <FactoryLamp pos={[-4.5, 7.4, 0]} />
          <FactoryLamp pos={[4.5, 7.4, 0]} />
        </group>
      )
  }
}
