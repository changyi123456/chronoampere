// ============================================================================
// MagnetRooms.tsx — Ch2 帶電質點在電磁場中的運動
//   CycloRoom（e/m）：含測量不確定度 + 多組數據平均（COV 探究）。
//   MaglockRoom（CRT）：含湯姆森平衡法 v = E/B 讀數。
// ============================================================================
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { RoomShell } from '../components/RoomShell'
import { Knob } from '../components/lab'
import { useGame } from '../store/store'
import { useSettle } from '../game/useSettle'
import {
  emVelocity, emField, emRadius, emEstimate, emMeasurementOK, EM,
  crtDeflect, crtBalance, CRT,
} from '../game/physics'
import { resetLive, pushSample, live } from '../game/live'

const COPPER = '#c0763a'
function lab(border: string): React.CSSProperties {
  return { padding: '1px 6px', background: 'rgba(255,255,255,0.92)', border: `1px solid ${border}`, borderRadius: 5, color: '#16202e', font: "700 12px/1.2 system-ui,'Microsoft JhengHei',sans-serif", whiteSpace: 'nowrap', pointerEvents: 'none' }
}

// ===========================================================================
// 第三關：電子荷質比 e/m
// ===========================================================================
export function CycloRoom() {
  const { values, running, resetToken, setSolved, dragging, patch, setDragging, emLog } = useGame()
  const emLogRef = useRef(emLog)
  useEffect(() => { emLogRef.current = emLog }, [emLog])
  const t = useRef(0)
  const ang = useRef(0)
  const frame = useRef(0)
  const electrons = useRef<THREE.Group>(null)
  const settle = useSettle()
  const VRef = useRef(values.emacc_V)
  const IRef = useRef(values.emacc_I)
  useEffect(() => { VRef.current = values.emacc_V; IRef.current = values.emacc_I }, [values.emacc_V, values.emacc_I])

  useEffect(() => {
    t.current = 0; ang.current = 0
    resetLive({ aLabel: '電子圓周運動 y 分量', aColor: '#26d0c0', yMin: -1.2, yMax: 1.2, yUnit: '' })
  }, [resetToken])

  const S = 34, gunY = 0.4, cx = 0, cz = 0
  const cyc = useRef({ R: 1, done: false })

  useFrame(() => {
    const V = VRef.current, I = IRef.current
    const v = emVelocity(V), B = emField(I), r = emRadius(V, I)
    const vOK = Math.abs(V - EM.VaccTarget) <= EM.VaccTol
    const rOK = Math.abs(r - EM.rTarget) <= EM.rTol
    const emOK = emMeasurementOK(emLogRef.current)
    const settled = settle(`${V}|${I}`, dragging)
    if (running) {
      t.current += 1 / 60
      ang.current += 2 * (1 / 60) // 電子沿圓周動
      if (vOK && rOK && emOK && settled) { live.status = 'done'; setSolved('cyclo') }
      frame.current++
      if (frame.current % 2 === 0) pushSample({ t: +t.current.toFixed(2), a: +Math.sin(ang.current).toFixed(3) })
    }
    if (live.status !== 'done') live.status = running ? 'run' : 'idle'
    const est = emEstimate(emLogRef.current)
    if (live.status !== 'done') live.readout = [
      `電子速度 v = ${v.toExponential(2)} m/s　磁場 B = ${B.toExponential(2)} T`,
      `半徑 r = ${(r * 100).toFixed(2)} cm ${rOK ? '✓' : '（需 5.0）'}　V=${V}V ${vOK ? '✓' : '（需 200）'}`,
      `已記錄 ${emLogRef.current.length}/${EM.samplesNeeded} 組（讀值含 ±2% 不確定度，按「📋記錄」取樣）`,
      est === null
        ? '平均 e/m = ──（記錄數據後計算）'
        : `平均 e/m = ${est.toExponential(3)} C/kg ${emOK ? '✓' : ''}（理論 1.759×10¹¹）`,
    ]
    const Rscene = Math.min(r * S, 3.2)
    cyc.current.R = Rscene
    if (electrons.current) {
      const C = new THREE.Vector3(cx, gunY + Rscene, cz)
      electrons.current.children.forEach((e, idx) => {
        const a = -Math.PI / 2 + ang.current + (idx / 8) * Math.PI * 2
        e.position.set(C.x + Rscene * Math.cos(a), C.y + Rscene * Math.sin(a), 0)
      })
    }
  })

  const V = values.emacc_V, I = values.emacc_I
  const Rscene = Math.min(emRadius(V, I) * S, 3.2)
  const targetR = EM.rTarget * S
  const rOK = Math.abs(emRadius(V, I) - EM.rTarget) <= EM.rTol
  return (
    <RoomShell era="cyclo" accent="#26a0c0" camera={[0, 2.4, 8.5]}>
      {/* 玻璃球管 */}
      <mesh position={[0, 1.9, 0]}><sphereGeometry args={[2.4, 32, 32]} /><meshPhysicalMaterial color="#eaf4ff" transmission={1} thickness={0.4} roughness={0.05} ior={1.4} /></mesh>
      {/* 亥姆霍茲線圈（兩共軸銅環） */}
      {[-1.0, 1.0].map((z) => (
        <mesh key={z} position={[0, 1.9, z]}><torusGeometry args={[2.7, 0.12, 16, 48]} /><meshStandardMaterial color={COPPER} metalness={0.6} roughness={0.35} /></mesh>
      ))}
      <Html position={[3.0, 3.2, 0]} center distanceFactor={14}><div style={lab('#c0763a')}>亥姆霍茲線圈</div></Html>

      {/* 電子槍（底部朝上） */}
      <mesh position={[0, gunY - 0.2, 0]}><cylinderGeometry args={[0.18, 0.22, 0.5, 16]} /><meshStandardMaterial color="#2b3340" metalness={0.4} roughness={0.5} /></mesh>
      <Html position={[0, -0.05, 0]} center distanceFactor={13}><div style={lab('#9a7b3a')}>電子槍</div></Html>

      {/* 目標半徑環（5 cm 參考）：z 偏移避免與電子束圈重合時 z-fighting */}
      <mesh position={[0, gunY + targetR, -0.06]}><torusGeometry args={[targetR, 0.025, 12, 48]} /><meshStandardMaterial color={rOK ? '#2e9e6b' : '#94a3b8'} emissive={rOK ? '#2e9e6b' : '#000'} emissiveIntensity={rOK ? 0.8 : 0} /></mesh>
      {/* 電子束圓 + 沿圓周運動的電子：只有按下「啟動」後才出現 */}
      {running && (
        <>
          <mesh position={[0, gunY + Rscene, 0.06]}><torusGeometry args={[Rscene, 0.04, 12, 64]} /><meshStandardMaterial color="#26d0c0" emissive="#26d0c0" emissiveIntensity={1.1} /></mesh>
          <group ref={electrons}>
            {Array.from({ length: 8 }).map((_, i) => (
              <mesh key={i}><sphereGeometry args={[0.075, 8, 8]} /><meshStandardMaterial color="#ffffff" emissive="#aef" emissiveIntensity={1.2} /></mesh>
            ))}
          </group>
        </>
      )}
      <Html position={[0, gunY + targetR * 2 + 0.3, 0]} center distanceFactor={14}><div style={lab('#2e9e6b')}>目標 r = 5.0 cm</div></Html>
      <Knob pos={[-1.9, 1.0, 2.9]} value={values.emacc_V} min={50} max={300} step={1} label="加速電壓 V" unit="V" accent="#38bdf8" onChange={(v) => patch({ emacc_V: v })} onDragState={setDragging} />
      <Knob pos={[0.3, 1.0, 2.9]} value={values.emacc_I} min={0.5} max={3} step={0.01} label="線圈電流 I" unit="A" accent="#d23b3b" onChange={(v) => patch({ emacc_I: v })} onDragState={setDragging} />
    </RoomShell>
  )
}

// ===========================================================================
// 第四關：陰極射線管 CRT 偏轉
// ===========================================================================
export function MaglockRoom() {
  const { values, running, resetToken, setSolved, dragging, patch, setDragging } = useGame()
  const t = useRef(0)
  const frame = useRef(0)
  const spot = useRef<THREE.Mesh>(null)
  const settle = useSettle()
  const VaRef = useRef(values.crt_Va)
  const VdRef = useRef(values.crt_Vd)
  const BRef = useRef(values.crt_B)
  useEffect(() => { VaRef.current = values.crt_Va; VdRef.current = values.crt_Vd; BRef.current = values.crt_B }, [values.crt_Va, values.crt_Vd, values.crt_B])

  useEffect(() => {
    t.current = 0
    resetLive({ aLabel: '螢幕總偏轉 y', aColor: '#22c55e', yMin: -8, yMax: 8, yUnit: 'cm', targetY: CRT.yT_target * 100 })
  }, [resetToken])

  // 場景座標映射
  const S = 20, cy = 1.5, gunX = -4.2, plateX0 = -2.0
  const L = CRT.L, D = CRT.D
  const plateX1 = plateX0 + L * S // = 0
  const screenX = plateX1 + D * S // = 4

  const MAXP = 90
  const beam = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3))
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#4ade80' }))
  }, [])

  useFrame(() => {
    const Va = VaRef.current, Vd = VdRef.current, Bm = BRef.current
    const { vx, ay, totalY } = crtDeflect(Va, Vd, Bm)
    const yE = crtDeflect(Va, Vd, 0).totalY
    const VaOK = Math.abs(Va - CRT.VaTarget) <= CRT.VaTol
    const yEOK = Math.abs(yE - CRT.yE_target) <= CRT.yE_tol
    const yTOK = Math.abs(totalY - CRT.yT_target) <= CRT.yT_tol
    const settled = settle(`${Va}|${Vd}|${Bm}`, dragging)
    if (running) {
      t.current += 1 / 60
      if (VaOK && yEOK && yTOK && settled) { live.status = 'done'; setSolved('maglock') }
      frame.current++
      if (frame.current % 2 === 0) pushSample({ t: +t.current.toFixed(2), a: +(totalY * 100).toFixed(2) })
    }
    if (live.status !== 'done') live.status = running ? 'run' : 'idle'
    const vBal = crtBalance(Va, Vd, Bm)
    if (live.status !== 'done') live.readout = [
      `加速電壓 Va = ${Va} V ${VaOK ? '✓' : '（需 2000）'}`,
      `電場分量 y_E = ${(yE * 100).toFixed(2)} cm ${yEOK ? '✓' : `（需 ${(CRT.yE_target * 100).toFixed(0)}）`}`,
      `螢幕總偏轉 y = ${(totalY * 100).toFixed(2)} cm ${yTOK ? '✓' : `（需 +${(CRT.yT_target * 100).toFixed(0)}）`}`,
      vBal !== null
        ? `⚖ 湯姆森平衡！E/B 抵消 → 測得 v = E/B = ${vBal.toExponential(2)} m/s（理論 √(2eVa/m) = ${vx.toExponential(2)}）`
        : `Vd = ${Vd} V　B = ${Bm.toFixed(2)} mT（試試讓兩場抵消 y≈0：湯姆森平衡法測 v）`,
    ]
    // 電子束軌跡：只有按下「啟動」後才射出顯示
    if (running) {
      const arr = beam.geometry.attributes.position.array as Float32Array
      let n = 0
      const push = (x: number, y: number) => { arr[n * 3] = x; arr[n * 3 + 1] = y; arr[n * 3 + 2] = 0; n++ }
      push(gunX, cy); push(plateX0, cy)
      const t1 = L / vx, y1 = 0.5 * ay * t1 * t1, vy1 = ay * t1
      const NN = 24
      for (let i = 1; i <= NN; i++) { const dx = (L * i) / NN; const tt = dx / vx; push(plateX0 + dx * S, cy + 0.5 * ay * tt * tt * S) }
      const MM = 12
      for (let i = 1; i <= MM; i++) { const dx2 = (D * i) / MM; push(plateX1 + dx2 * S, cy + (y1 + vy1 * (dx2 / vx)) * S) }
      beam.geometry.setDrawRange(0, n)
      beam.geometry.attributes.position.needsUpdate = true
      const spotY = Math.min(Math.max(cy + totalY * S, cy - 2.2), cy + 2.2)
      if (spot.current) spot.current.position.set(screenX, spotY, 0)
    } else {
      beam.geometry.setDrawRange(0, 0)
    }
  })

  const Vd = values.crt_Vd
  const plateColTop = Vd > 0 ? '#f87171' : Vd < 0 ? '#60a5fa' : '#888'
  const plateColBot = Vd < 0 ? '#f87171' : Vd > 0 ? '#60a5fa' : '#888'
  const gap = CRT.d * S // = 1.0
  return (
    <RoomShell era="maglock" accent="#22c55e" camera={[0, 2.4, 9.5]}>
      {/* 玻璃管 */}
      <mesh position={[(gunX + screenX) / 2, cy, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.6, 1.6, screenX - gunX + 1, 24, 1, true]} /><meshPhysicalMaterial color="#eaf4ff" transmission={1} thickness={0.18} roughness={0.07} ior={1.4} side={THREE.DoubleSide} /></mesh>
      {/* 電子槍 */}
      <mesh position={[gunX - 0.4, cy, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.3, 0.3, 0.8, 16]} /><meshStandardMaterial color="#2b3340" metalness={0.4} /></mesh>
      <Html position={[gunX - 0.4, cy - 0.7, 0]} center distanceFactor={14}><div style={lab('#9a7b3a')}>電子槍（加速 Va）</div></Html>
      {/* 偏轉電場板（上下） */}
      <mesh position={[(plateX0 + plateX1) / 2, cy + gap / 2 + 0.1, 0]}><boxGeometry args={[plateX1 - plateX0, 0.12, 1]} /><meshStandardMaterial color={plateColTop} /></mesh>
      <mesh position={[(plateX0 + plateX1) / 2, cy - gap / 2 - 0.1, 0]}><boxGeometry args={[plateX1 - plateX0, 0.12, 1]} /><meshStandardMaterial color={plateColBot} /></mesh>
      <Html position={[(plateX0 + plateX1) / 2, cy + gap / 2 + 0.6, 0]} center distanceFactor={14}><div style={lab('#d23b3b')}>偏轉板 Vd</div></Html>
      {/* 磁場區域標示（板後） */}
      <mesh position={[plateX1 + 1.0, cy, -0.1]}><circleGeometry args={[0.9, 24]} /><meshStandardMaterial color="#c084fc" transparent opacity={0.15} side={THREE.DoubleSide} /></mesh>
      <Html position={[plateX1 + 1.0, cy + 1.1, 0]} center distanceFactor={14}><div style={lab('#9333ea')}>磁場 B {values.crt_B >= 0 ? '⊗' : '⊙'}</div></Html>
      {/* 螢光幕 + 十字準線 */}
      <mesh position={[screenX, cy, 0]}><boxGeometry args={[0.12, 4.4, 3]} /><meshStandardMaterial color="#0b3b1f" /></mesh>
      <mesh position={[screenX + 0.07, cy, 0]}><boxGeometry args={[0.02, 4.2, 0.03]} /><meshStandardMaterial color="#1f8a4c" /></mesh>
      <mesh position={[screenX + 0.07, cy, 0]}><boxGeometry args={[0.02, 0.03, 2.8]} /><meshStandardMaterial color="#1f8a4c" /></mesh>
      <Html position={[screenX, cy + 2.5, 0]} center distanceFactor={14}><div style={lab('#16a34a')}>螢光幕</div></Html>
      <mesh position={[screenX + 0.08, cy + CRT.yT_target * S, 0]}><torusGeometry args={[0.18, 0.03, 8, 24]} /><meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.9} /></mesh>
      <Html position={[screenX + 0.7, cy + CRT.yT_target * S, 0]} center distanceFactor={14}><div style={lab('#d97706')}>目標 +1cm</div></Html>
      {/* 電子束 + 光點 */}
      <primitive object={beam} />
      <mesh ref={spot} position={[screenX, cy, 0]} visible={running}><sphereGeometry args={[0.14, 16, 16]} /><meshStandardMaterial color="#86efac" emissive="#22c55e" emissiveIntensity={1.4} /></mesh>
      <Knob pos={[-2.6, 1.0, 3.0]} value={values.crt_Va} min={500} max={5000} step={50} label="加速 Va" unit="V" accent="#38bdf8" onChange={(v) => patch({ crt_Va: v })} onDragState={setDragging} />
      <Knob pos={[-0.7, 1.0, 3.0]} value={values.crt_Vd} min={-500} max={500} step={10} label="偏轉 Vd" unit="V" accent="#d23b3b" onChange={(v) => patch({ crt_Vd: v })} onDragState={setDragging} />
      <Knob pos={[1.2, 1.0, 3.0]} value={values.crt_B} min={-2} max={2} step={0.01} label="磁場 B" unit="mT" accent="#c084fc" onChange={(v) => patch({ crt_B: v })} onDragState={setDragging} />
    </RoomShell>
  )
}
