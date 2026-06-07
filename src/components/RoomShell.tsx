// ============================================================================
// RoomShell.tsx — 實驗台外殼（AAA 渲染：程序式環境反射 + 柔和接觸陰影 +
// ACES 色調 + 發光邊條）。拖曳元件時停用 OrbitControls。
// ============================================================================
import { useEffect, type ReactNode } from 'react'
import { OrbitControls, Environment, Lightformer, ContactShadows } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useGame } from '../store/store'

export function RoomShell({ accent = '#1f6feb', camera = [0, 2.6, 8.5], children }: {
  accent?: string; camera?: [number, number, number]; children: ReactNode
}) {
  const cam = useThree((s) => s.camera)
  const { dragging } = useGame()

  useEffect(() => {
    cam.position.set(camera[0], camera[1], camera[2])
    cam.lookAt(0, 1.1, 0)
  }, [cam, camera])

  return (
    <group>
      <color attach="background" args={['#dce3ec']} />
      <fog attach="fog" args={['#dce3ec', 20, 52]} />

      <OrbitControls enabled={!dragging} enablePan={false} minDistance={4} maxDistance={16} maxPolarAngle={Math.PI * 0.52} target={[0, 1.1, 0]} />

      {/* 程序式攝影棚環境（離線，給金屬/玻璃真實反射） */}
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2.4} position={[0, 6, -6]} scale={[16, 9, 1]} color="#ffffff" />
        <Lightformer intensity={1.2} position={[-8, 3, 3]} scale={[9, 9, 1]} color="#bcd4ff" />
        <Lightformer intensity={1.1} position={[8, 3, 2]} scale={[9, 9, 1]} color="#ffe6c0" />
        <Lightformer intensity={0.9} position={[0, 4, 8]} scale={[12, 7, 1]} color="#ffffff" />
      </Environment>

      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#ffffff', '#c2cad4', 0.45]} />
      <directionalLight position={[5, 9, 6]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001}>
        <orthographicCamera attach="shadow-camera" args={[-12, 12, 12, -12, 0.1, 40]} />
      </directionalLight>
      <directionalLight position={[-6, 5, -3]} intensity={0.3} />

      {/* 實驗桌面 */}
      <mesh position={[0, -0.2, 0]} receiveShadow>
        <boxGeometry args={[22, 0.4, 8]} />
        <meshStandardMaterial color="#b8995f" roughness={0.7} metalness={0.1} envMapIntensity={0.5} />
      </mesh>
      {/* 發光章節色邊條（不受色調壓縮 → 明顯發亮） */}
      <mesh position={[0, 0.02, 3.95]}>
        <boxGeometry args={[22, 0.06, 0.12]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      {/* 後牆 */}
      <mesh position={[0, 5, -7]} receiveShadow>
        <planeGeometry args={[30, 14]} />
        <meshStandardMaterial color="#e7ecf2" roughness={1} />
      </mesh>

      {/* 柔和接觸陰影（把器材踏實地黏在桌面上） */}
      <ContactShadows position={[0, 0.02, 0]} opacity={0.45} scale={24} blur={2.6} far={5} resolution={1024} color="#1a1f2a" />

      {children}
    </group>
  )
}
