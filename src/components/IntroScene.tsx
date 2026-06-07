// ============================================================================
// IntroScene.tsx — 入口頁「時空穿梭」沉浸場景（循環動畫）：
// 曲速光流隧道 + 時空漩渦環 + 星空，攝影機在隧道中心緩慢搖滾，營造穿越感。
// ============================================================================
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'

// 曲速光流（朝鏡頭飛來、循環回收的線段）
function WarpStreaks() {
  const N = 340
  const data = useMemo(() => {
    const arr: { x: number; y: number; z: number; sp: number; len: number }[] = []
    for (let i = 0; i < N; i++) {
      const ang = Math.random() * Math.PI * 2
      const rad = 0.6 + Math.random() * 9
      arr.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad, z: -Math.random() * 90, sp: 24 + Math.random() * 46, len: 2 + Math.random() * 5 })
    }
    return arr
  }, [])
  const obj = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3))
    const m = new THREE.LineBasicMaterial({ color: '#5eead4', transparent: true, opacity: 0.9, toneMapped: false })
    return new THREE.LineSegments(g, m)
  }, [])
  useFrame((st, dt) => {
    const pos = obj.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < N; i++) {
      const d = data[i]
      d.z += d.sp * dt
      if (d.z > 8) { d.z = -90; const ang = Math.random() * Math.PI * 2; const rad = 0.6 + Math.random() * 9; d.x = Math.cos(ang) * rad; d.y = Math.sin(ang) * rad }
      const tail = d.len * (1 + (d.z + 90) / 98 * 2.5)
      const j = i * 6
      pos[j] = d.x; pos[j + 1] = d.y; pos[j + 2] = d.z
      pos[j + 3] = d.x; pos[j + 4] = d.y; pos[j + 5] = d.z - tail
    }
    obj.geometry.attributes.position.needsUpdate = true
    const mat = obj.material as THREE.LineBasicMaterial
    mat.color.setHSL(0.5 + 0.12 * Math.sin(st.clock.elapsedTime * 0.25), 0.85, 0.62)
  })
  return <primitive object={obj} />
}

// 時空漩渦環（朝鏡頭推進、循環）
function Vortex() {
  const grp = useRef<THREE.Group>(null)
  const rings = useRef<THREE.Mesh[]>([])
  useFrame((_, dt) => {
    if (grp.current) grp.current.rotation.z += dt * 0.4
    rings.current.forEach((m) => {
      if (!m) return
      m.position.z += dt * 14
      if (m.position.z > 7) m.position.z = -56
      const s = 1.1 + (m.position.z + 56) / 63 * 4
      m.scale.set(s, s, 1)
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, Math.min(0.9, (7 - m.position.z) / 26))
    })
  })
  const colors = ['#5eead4', '#7c5cff', '#38bdf8', '#ffae42']
  return (
    <group ref={grp}>
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} ref={(el) => { if (el) rings.current[i] = el }} position={[0, 0, -56 + i * 6.3]}>
          <torusGeometry args={[1.5, 0.05, 8, 56]} />
          <meshBasicMaterial color={colors[i % colors.length]} transparent opacity={0.5} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function HeroTraveler() {
  const g = useRef<THREE.Group>(null)
  const halo = useRef<THREE.Mesh>(null)
  const thrust = useRef<THREE.Mesh>(null)
  useFrame((st, dt) => {
    if (g.current) {
      g.current.position.set(Math.sin(st.clock.elapsedTime * 0.8) * 0.5, -0.4 + Math.sin(st.clock.elapsedTime * 1.6) * 0.18, 2)
      g.current.rotation.z = Math.sin(st.clock.elapsedTime * 0.7) * 0.18
      g.current.rotation.y = Math.sin(st.clock.elapsedTime * 0.5) * 0.12
    }
    if (halo.current) halo.current.rotation.z += dt * 2
    if (thrust.current) { const sc = 1 + Math.sin(st.clock.elapsedTime * 18) * 0.25; thrust.current.scale.set(1, 1, sc) }
  })
  return (
    <group ref={g} position={[0, -0.4, 2]} scale={0.6}>
      <mesh><icosahedronGeometry args={[0.5, 1]} /><meshStandardMaterial color="#dfe9f5" metalness={0.9} roughness={0.2} emissive="#9fd4ff" emissiveIntensity={0.2} /></mesh>
      <mesh position={[0, 0, -0.45]}><sphereGeometry args={[0.14, 16, 16]} /><meshBasicMaterial color="#7fe9ff" toneMapped={false} /></mesh>
      <mesh ref={halo} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.82, 0.04, 10, 48]} /><meshBasicMaterial color="#5eead4" toneMapped={false} /></mesh>
      {/* 推進尾焰（朝隧道後方） */}
      <mesh ref={thrust} position={[0, 0, 1.0]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.28, 1.6, 20, 1, true]} /><meshBasicMaterial color="#38d0ff" transparent opacity={0.5} toneMapped={false} side={THREE.DoubleSide} /></mesh>
      <pointLight color="#9fd4ff" intensity={8} distance={6} />
    </group>
  )
}

function CamRig() {
  const { camera } = useThree()
  useFrame((st) => {
    camera.position.set(Math.sin(st.clock.elapsedTime * 0.15) * 0.4, Math.cos(st.clock.elapsedTime * 0.12) * 0.3, 7)
    camera.lookAt(0, 0, -8)
    camera.rotation.z = Math.sin(st.clock.elapsedTime * 0.1) * 0.06
  })
  return null
}

export function IntroScene() {
  return (
    <group>
      <color attach="background" args={['#03040a']} />
      <fog attach="fog" args={['#03040a', 14, 80]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 2]} intensity={20} color="#5eead4" distance={30} />
      <Stars radius={120} depth={60} count={2200} factor={4} fade speed={1.2} />
      <WarpStreaks />
      <Vortex />
      {/* 中央時光核心微光 */}
      <mesh position={[0, 0, -4]}>
        <icosahedronGeometry args={[0.8, 2]} />
        <meshBasicMaterial color="#9fe9ff" transparent opacity={0.5} toneMapped={false} wireframe />
      </mesh>
      <HeroTraveler />
      <CamRig />
    </group>
  )
}
