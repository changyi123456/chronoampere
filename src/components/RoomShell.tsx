// ============================================================================
// RoomShell.tsx — 年代化實驗室外殼（資料驅動 EraTheme）：
//   木紋桌面（程序貼圖）+ 黑板粉筆公式 + 年代道具 + 燭光 + 神秘紙條。
// 拖曳元件時停用 OrbitControls。
// ============================================================================
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { OrbitControls, Environment, Lightformer, ContactShadows } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../store/store'
import { ERAS } from '../theme'
import { CHALLENGES, type ChallengeId } from '../story/script'
import { woodTexture, paperTexture } from './textures'
import { Blackboard, EraProps } from './props'

// ── 燭光（暖色閃爍點光 + 燭身） ──────────────────────────────────────────
function Candle({ pos }: { pos: [number, number, number] }) {
  const light = useRef<THREE.PointLight>(null)
  const flame = useRef<THREE.Mesh>(null)
  useFrame((st) => {
    const f = 1 + Math.sin(st.clock.elapsedTime * 9.3) * 0.12 + Math.sin(st.clock.elapsedTime * 23.7) * 0.06
    if (light.current) light.current.intensity = 4.2 * f
    if (flame.current) flame.current.scale.setScalar(0.9 + 0.18 * f)
  })
  return (
    <group position={pos}>
      <mesh castShadow><cylinderGeometry args={[0.06, 0.075, 0.5, 12]} /><meshStandardMaterial color="#efe2c8" roughness={0.6} /></mesh>
      <mesh ref={flame} position={[0, 0.34, 0]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="#ffd27a" emissive="#ff9a2a" emissiveIntensity={3} toneMapped={false} /></mesh>
      <pointLight ref={light} position={[0, 0.45, 0]} color="#ffb45e" intensity={4.2} distance={9} decay={2} castShadow={false} />
    </group>
  )
}

// ── 神秘紙條（環境敘事道具：每間房都「一直都在」） ───────────────────────
function MysteryNote({ era }: { era: ChallengeId }) {
  const { fragments, setDialogue } = useGame()
  const theme = ERAS[era]
  const meta = CHALLENGES[era]
  const got = !!fragments[era]
  const glow = useRef<THREE.MeshStandardMaterial>(null)
  const paper = useMemo(() => paperTexture(), [])
  useFrame((st) => {
    if (glow.current) glow.current.emissiveIntensity = got ? 0.05 : 0.18 + Math.sin(st.clock.elapsedTime * 1.6) * 0.1
  })
  return (
    <group position={theme.notePos} rotation={[0, 0.5, 0]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0.3]} position={[0, 0.035, 0]} castShadow
        onClick={(e) => {
          e.stopPropagation()
          setDialogue(got
            ? { speaker: '泛黃的紙條', accent: '#fbbf24', lines: [meta.clue, '（你把它的內容抄進了殘頁。它靜靜躺在桌上，彷彿屬於這裡。）'] }
            : {
                speaker: '泛黃的紙條', accent: '#fbbf24', lines: [
                  '桌上夾著一張泛黃的紙條，字跡有種說不出的熟悉感。',
                  `${meta.system.split('・')[1] ?? '這位科學家'}說：「這張紙條？它一直都在啊。」`,
                  '——可它怎麼會在這裡？先重現實驗、取得殘頁，也許能看清上面的字。',
                ],
              })
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'default')}>
        <planeGeometry args={[0.46, 0.62]} />
        <meshStandardMaterial ref={glow} map={paper} roughness={0.85} emissive="#ffd27a" emissiveIntensity={0.18} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export function RoomShell({ era, accent = '#1f6feb', camera = [0, 2.6, 8.5], children }: {
  era: ChallengeId; accent?: string; camera?: [number, number, number]; children: ReactNode
}) {
  const cam = useThree((s) => s.camera)
  const viewportWidth = useThree((s) => s.size.width)
  const { dragging } = useGame()
  const theme = ERAS[era]
  const lowTier = viewportWidth < 760
  const wood = useMemo(() => woodTexture(theme.desk), [theme.desk])

  useEffect(() => {
    cam.position.set(camera[0], camera[1], camera[2])
    cam.lookAt(0, 1.1, 0)
  }, [cam, camera])

  return (
    <group>
      <color attach="background" args={[theme.bg]} />
      <fog attach="fog" args={[theme.bg, theme.fogNear, theme.fogFar]} />

      <OrbitControls enabled={!dragging} enablePan={false} minDistance={4} maxDistance={16} maxPolarAngle={Math.PI * 0.52} target={[0, 1.1, 0]} />

      {/* 程序式環境（給金屬/玻璃反射；色溫跟年代走） */}
      <Environment resolution={lowTier ? 128 : 256} frames={1}>
        <Lightformer intensity={theme.dark ? 0.7 : 1.8} position={[0, 6, -6]} scale={[16, 9, 1]} color={theme.keyColor} />
        <Lightformer intensity={0.8} position={[-8, 3, 3]} scale={[9, 9, 1]} color={theme.fillColor} />
        <Lightformer intensity={0.7} position={[8, 3, 2]} scale={[9, 9, 1]} color={theme.windowGlow} />
      </Environment>

      <ambientLight intensity={theme.ambient} />
      <hemisphereLight args={[theme.keyColor, theme.bg, theme.dark ? 0.18 : 0.4]} />
      <directionalLight position={[5, 9, 6]} intensity={theme.keyIntensity} color={theme.keyColor} castShadow={!lowTier} shadow-mapSize={lowTier ? [512, 512] : [2048, 2048]} shadow-bias={-0.0001}>
        <orthographicCamera attach="shadow-camera" args={[-12, 12, 12, -12, 0.1, 40]} />
      </directionalLight>
      <directionalLight position={[-6, 5, -3]} intensity={0.25} color={theme.fillColor} />

      {/* 實驗桌面（程序式木紋，年代色調） */}
      <mesh position={[0, -0.2, 0]} receiveShadow>
        <boxGeometry args={[22, 0.4, 8]} />
        <meshStandardMaterial map={wood} color="#d8cdbd" roughness={0.78} metalness={0.04} envMapIntensity={0.4} />
      </mesh>
      {/* 發光章節色邊條（Bloom 拾取） */}
      <mesh position={[0, 0.02, 3.95]}>
        <boxGeometry args={[22, 0.06, 0.12]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      {/* 後牆（年代材質色） */}
      <mesh position={[0, 5, -7]} receiveShadow>
        <planeGeometry args={[30, 14]} />
        <meshStandardMaterial color={theme.wall} roughness={1} />
      </mesh>
      {/* 牆上的窗（發光面：年代窗外光） */}
      <mesh position={[-6.5, 5.4, -6.85]}>
        <planeGeometry args={[2.4, 3.4]} />
        <meshStandardMaterial color={theme.windowGlow} emissive={theme.windowGlow} emissiveIntensity={theme.dark ? 0.25 : 1.1} toneMapped={false} />
      </mesh>
      <mesh position={[-6.5, 5.4, -6.75]}>
        <boxGeometry args={[2.6, 0.1, 0.06]} />
        <meshStandardMaterial color="#1c1410" />
      </mesh>
      <mesh position={[-6.5, 5.4, -6.75]}>
        <boxGeometry args={[0.1, 3.6, 0.06]} />
        <meshStandardMaterial color="#1c1410" />
      </mesh>

      {/* 黑板：本關公式（年代敘事 × 物理教學） */}
      <Blackboard era={era} />

      {/* 年代道具（書堆/油燈/木櫃/磚拱/蒸汽管……依年代自動切換） */}
      <EraProps era={era} />

      {/* 燭光（暖年代限定） */}
      {theme.candle && <Candle pos={[-4.6, 0.25, 2.6]} />}
      {theme.candle && <Candle pos={[4.8, 0.25, -1.8]} />}

      {/* 柔和接觸陰影 */}
      {!lowTier && <ContactShadows position={[0, 0.02, 0]} opacity={theme.dark ? 0.6 : 0.45} scale={24} blur={2.6} far={5} resolution={1024} color="#000508" />}

      {/* 神秘紙條（海龜湯環境敘事） */}
      <MysteryNote era={era} />

      {children}
    </group>
  )
}
