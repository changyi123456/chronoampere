// ============================================================================
// App.tsx — 《方舟九十・ARK-90》3D 物理解謎海龜湯 RPG 主組裝
//   Canvas（3D 場景路由）+ Hud（2D overlay）。狀態用外部 store（store.tsx）。
// ============================================================================
import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from './store/store'
import { Hud } from './components/Hud'
import { HubScene } from './components/HubScene'
import { IntroScene } from './components/IntroScene'
import { LampRoom, SplitRoom } from './rooms/CircuitRooms'
import { CycloRoom, MaglockRoom } from './rooms/MagnetRooms'
import { DynamoRoom, XfmrRoom } from './rooms/InductionRooms'
import { COLORS } from './theme'
import type { Scene } from './story/script'

// 開場 / 結局背景：緩慢旋轉的線框球
function Backdrop() {
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.1
  })
  return (
    <group>
      <color attach="background" args={[COLORS.bg]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 0]} intensity={30} color={COLORS.teal} distance={30} />
      <group ref={g}>
        <mesh>
          <icosahedronGeometry args={[3, 1]} />
          <meshStandardMaterial color={COLORS.teal} emissive={COLORS.teal} emissiveIntensity={0.4} wireframe />
        </mesh>
        <mesh rotation={[0.5, 0.5, 0]}>
          <torusGeometry args={[4.5, 0.02, 8, 80]} />
          <meshStandardMaterial color={COLORS.blue} emissive={COLORS.blue} emissiveIntensity={0.6} />
        </mesh>
      </group>
    </group>
  )
}

function SceneRouter({ scene }: { scene: Scene }) {
  switch (scene) {
    case 'hub':
      return <HubScene />
    case 'intro':
      return <IntroScene />
    case 'finale':
      return <HubScene cinematic />
    case 'lamp':
      return <LampRoom />
    case 'split':
      return <SplitRoom />
    case 'cyclo':
      return <CycloRoom />
    case 'maglock':
      return <MaglockRoom />
    case 'dynamo':
      return <DynamoRoom />
    case 'xfmr':
      return <XfmrRoom />
    default:
      return <Backdrop />
  }
}

function Game() {
  const { scene } = useGame()
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: COLORS.bg }}>
      <Canvas shadows="soft" dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }} camera={{ position: [0, 8, 12], fov: 55 }} style={{ position: "absolute", inset: 0 }}>
        <SceneRouter scene={scene} />
      </Canvas>
      <Hud />
    </div>
  )
}

export default function App() {
  return <Game />
}
