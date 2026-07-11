// ============================================================================
// App.tsx — 3D 物理解謎海龜湯 RPG 主組裝
//   Canvas（3D 場景路由）+ Effects（後製）+ Hud（2D overlay）。
// ============================================================================
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from './store/store'
import { Hud } from './components/Hud'
import { Effects } from './components/Effects'
import { IntroScene } from './components/IntroScene'
import { COLORS } from './theme'
import type { Scene } from './story/script'
import { setTouchMove } from './game/touch'

const HubScene = lazy(() => import('./components/HubScene').then((module) => ({ default: module.HubScene })))
const LampRoom = lazy(() => import('./rooms/CircuitRooms').then((module) => ({ default: module.LampRoom })))
const SplitRoom = lazy(() => import('./rooms/CircuitRooms').then((module) => ({ default: module.SplitRoom })))
const CycloRoom = lazy(() => import('./rooms/MagnetRooms').then((module) => ({ default: module.CycloRoom })))
const MaglockRoom = lazy(() => import('./rooms/MagnetRooms').then((module) => ({ default: module.MaglockRoom })))
const DynamoRoom = lazy(() => import('./rooms/InductionRooms').then((module) => ({ default: module.DynamoRoom })))
const XfmrRoom = lazy(() => import('./rooms/InductionRooms').then((module) => ({ default: module.XfmrRoom })))

type QualityTier = 'low' | 'high'

function useQualityTier(): QualityTier {
  const detect = () => {
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
    return window.innerWidth < 760 || memory <= 4 ? 'low' as const : 'high' as const
  }
  const [tier, setTier] = useState<QualityTier>(detect)
  useEffect(() => {
    const update = () => setTier(detect())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return tier
}

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
  const { scene, setRunning } = useGame()
  const quality = useQualityTier()
  useEffect(() => {
    const pause = () => {
      if (document.hidden || !document.hasFocus()) {
        setRunning(false)
        setTouchMove(0, 0)
      }
    }
    document.addEventListener('visibilitychange', pause)
    window.addEventListener('blur', pause)
    return () => {
      document.removeEventListener('visibilitychange', pause)
      window.removeEventListener('blur', pause)
    }
  }, [setRunning])
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: COLORS.bg }}>
      <Canvas shadows={quality === 'high' ? 'soft' : false} dpr={quality === 'high' ? [1, 2] : [1, 1.25]} gl={{ antialias: quality === 'high', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }} camera={{ position: [0, 8, 12], fov: 55 }} style={{ position: "absolute", inset: 0 }}>
        <Suspense fallback={null}><SceneRouter scene={scene} /></Suspense>
        <Effects scene={scene} quality={quality} />
      </Canvas>
      <Hud />
    </div>
  )
}

export default function App() {
  return <Game />
}
