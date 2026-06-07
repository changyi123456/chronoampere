// ============================================================================
// CurrentFlow.tsx — 沿著一條折線流動的發光光點，用來表現「電流」。
// speed 由各關的電流大小驅動；count 為光點數量。
// ============================================================================
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function CurrentFlow({
  points,
  color,
  speed = 1,
  count = 6,
  size = 0.08,
}: {
  points: [number, number, number][]
  color: string
  speed?: number
  count?: number
  size?: number
}) {
  const group = useRef<THREE.Group>(null)
  const offset = useRef(0)

  // 把折線轉成可取樣的曲線，並預先算好累積長度
  const curve = useMemo(() => {
    const vecs = points.map((p) => new THREE.Vector3(...p))
    return new THREE.CatmullRomCurve3(vecs, false, 'catmullrom', 0)
  }, [points])

  useFrame((_, dt) => {
    offset.current = (offset.current + dt * speed * 0.15) % 1
    const g = group.current
    if (!g) return
    g.children.forEach((child, i) => {
      const t = (offset.current + i / count) % 1
      const p = curve.getPoint(t)
      child.position.set(p.x, p.y, p.z)
    })
  })

  return (
    <group ref={group}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[size, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} />
        </mesh>
      ))}
    </group>
  )
}
