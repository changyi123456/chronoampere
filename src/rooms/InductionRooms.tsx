// ============================================================================
// InductionRooms.tsx — Ch3 電磁感應
//   DynamoRoom: 交流發電機。示波器同屏 ε(t) 與 φ(t)：看見 90° 相位差。
//   XfmrRoom  : 變壓器 + 次級負載（電流比 / 功率守恆讀數）。
// ============================================================================
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { RoomShell } from '../components/RoomShell'
import { CoilHelix, DialMeter, SupplyBox, Lead } from '../components/lab'
import { useGame } from '../store/store'
import { emfMax, emfAt, fluxAt, v2Peak, xfmrPrimaryAt, xfmrSecondaryAt, xfmrLoad, INDUCTION, XFMR } from '../game/physics'
import { resetLive, pushSample, live } from '../game/live'
import { useSettle } from '../game/useSettle'

type P3 = [number, number, number]
const COPPER = '#c0763a'
function lab(border: string): React.CSSProperties {
  return { padding: '1px 6px', background: 'rgba(255,255,255,0.92)', border: `1px solid ${border}`, borderRadius: 5, color: '#16202e', font: "700 12px/1.2 system-ui,'Microsoft JhengHei',sans-serif", whiteSpace: 'nowrap', pointerEvents: 'none' }
}

// ---------------------------------------------------------------------------
export function DynamoRoom() {
  const { values, running, resetToken, setSolved, dragging } = useGame()
  const theta = useRef(0)
  const t = useRef(0)
  const frame = useRef(0)
  const coil = useRef<THREE.Group>(null)
  const galv = useRef<THREE.Group>(null)
  const settle = useSettle()
  const NRef = useRef(values.dynamo_N)
  const wRef = useRef(values.dynamo_w)
  useEffect(() => { NRef.current = values.dynamo_N; wRef.current = values.dynamo_w }, [values.dynamo_N, values.dynamo_w])

  useEffect(() => {
    theta.current = 0; t.current = 0
    // 雙曲線同屏：ε(t) 與 φ(t)（×8 放大）── 看見 90° 相位差：「磁通為零時，電動勢最大」
    resetLive({ aLabel: '感應電動勢 ε(t)', aColor: '#1f6feb', bLabel: `磁通 φ(t)（×${INDUCTION.fluxPlotScale}）`, bColor: '#f59e0b', yMin: -16, yMax: 16, yUnit: 'V', targetY: INDUCTION.targetEmf })
  }, [resetToken])

  useFrame(() => {
    const em = emfMax(NRef.current, wRef.current)
    const emOK = Math.abs(em - INDUCTION.targetEmf) <= INDUCTION.tol
    const wOK = wRef.current >= INDUCTION.wLo && wRef.current <= INDUCTION.wHi
    if (running) {
      theta.current += wRef.current * (1 / 60)
      t.current += 1 / 60
      if (emOK && wOK && settle(`${NRef.current}|${wRef.current}`, dragging)) { live.status = 'done'; setSolved('dynamo') }
      frame.current++
      if (frame.current % 2 === 0) pushSample({
        t: +t.current.toFixed(2),
        a: +emfAt(NRef.current, wRef.current, t.current).toFixed(2),
        b: +(fluxAt(NRef.current, wRef.current, t.current) * INDUCTION.fluxPlotScale).toFixed(2),
      })
    }
    if (live.status !== 'done') live.status = running ? 'run' : 'idle'
    if (live.status !== 'done') live.readout = [
      `匝數 N = ${NRef.current.toFixed(0)}　轉速 ω = ${wRef.current.toFixed(1)} ${wOK ? '✓' : `（需 ${INDUCTION.wLo}-${INDUCTION.wHi}）`}`,
      `峰值 ε_max = ${em.toFixed(2)} V ${emOK ? '✓' : `（需 ${INDUCTION.targetEmf}）`}`,
      `瞬時 ε(t) = ${emfAt(NRef.current, wRef.current, t.current).toFixed(2)} V`,
      '觀察示波器：φ 過零的瞬間，ε 恰為峰值（相位差 90°）',
    ]
    if (coil.current) coil.current.rotation.x = theta.current
    if (galv.current) galv.current.rotation.z = Math.min(Math.max(emfAt(NRef.current, wRef.current, t.current) / 16, -1), 1) * 0.8
  })

  const w = 1.2, h = 0.8, gy = 1.5
  return (
    <RoomShell era="dynamo" accent="#1f6feb" camera={[0, 2.6, 9]}>
      <mesh position={[0, gy + 1.15, 0]} castShadow><boxGeometry args={[2.4, 0.6, 1.6]} /><meshStandardMaterial color="#d23b3b" metalness={0.3} roughness={0.5} /></mesh>
      <mesh position={[0, gy - 1.15, 0]} castShadow><boxGeometry args={[2.4, 0.6, 1.6]} /><meshStandardMaterial color="#2f6fe0" metalness={0.3} roughness={0.5} /></mesh>
      <Html position={[1.4, gy + 1.15, 0]} center distanceFactor={13}><div style={lab('#d23b3b')}>N 極</div></Html>
      <Html position={[1.4, gy - 1.15, 0]} center distanceFactor={13}><div style={lab('#2f6fe0')}>S 極</div></Html>

      <group ref={coil} position={[0, gy, 0]}>
        <Lead points={[[-w, h, 0], [w, h, 0]] as P3[]} color={COPPER} r={0.05} />
        <Lead points={[[-w, -h, 0], [w, -h, 0]] as P3[]} color={COPPER} r={0.05} />
        <Lead points={[[w, h, 0], [w, -h, 0]] as P3[]} color={COPPER} r={0.05} />
        <Lead points={[[-w, h, 0], [-w, -h, 0]] as P3[]} color={COPPER} r={0.05} />
      </group>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, gy, 0]}><cylinderGeometry args={[0.05, 0.05, 3.4, 10]} /><meshStandardMaterial color="#8a939e" metalness={0.8} roughness={0.3} /></mesh>
      {[-1.5, 1.55].map((x) => (
        <mesh key={x} position={[x, gy, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.16, 0.16, 0.16, 16]} /><meshStandardMaterial color="#d8b24a" metalness={0.7} roughness={0.3} /></mesh>
      ))}
      <Html position={[0, gy + 0.05, 1]} center distanceFactor={14}><div style={lab('#9a7b3a')}>旋轉線圈（N 匝）</div></Html>

      <DialMeter pos={[3.1, 0.6, 0.8]} label="G" color="#1f6feb" needleRef={galv} />
      <Lead points={[[1.7, gy, 0], [3.1, 1.0, 0.6], [3.1, 0.95, 0.8]] as P3[]} color="#d23b3b" />
      <Lead points={[[1.7, gy - 0.2, -0.2], [3.4, 0.9, 0.4], [3.1, 0.25, 0.8]] as P3[]} color="#222" />
    </RoomShell>
  )
}

// ---------------------------------------------------------------------------
export function XfmrRoom() {
  const { values, running, resetToken, setSolved, dragging } = useGame()
  const t = useRef(0)
  const frame = useRef(0)
  const n2Ref = useRef(values.xfmr_n2)
  const v1Ref = useRef(values.xfmr_v1)
  const priMat = useRef<THREE.MeshStandardMaterial>(null)
  const secMat = useRef<THREE.MeshStandardMaterial>(null)
  const volt = useRef<THREE.Group>(null)
  const settle = useSettle()
  useEffect(() => { n2Ref.current = values.xfmr_n2; v1Ref.current = values.xfmr_v1 }, [values.xfmr_n2, values.xfmr_v1])

  useEffect(() => {
    t.current = 0
    resetLive({ aLabel: '初級 V1(t)', aColor: '#d23b3b', bLabel: '次級 V2(t)', bColor: '#6f6fe0', yMin: -160, yMax: 160, yUnit: 'V' })
  }, [resetToken])

  useFrame(() => {
    const v1 = v1Ref.current, n2 = n2Ref.current
    const v2pk = v2Peak(n2, v1)
    const v1OK = Math.abs(v1 - XFMR.v1Target) <= XFMR.v1Tol
    const v2OK = Math.abs(v2pk - XFMR.v2Target) <= XFMR.tol
    if (running) {
      t.current += 1 / 60
      if (v1OK && v2OK && settle(`${v1}|${n2}`, dragging)) { live.status = 'done'; setSolved('xfmr') }
      frame.current++
      if (frame.current % 2 === 0) pushSample({ t: +t.current.toFixed(2), a: +xfmrPrimaryAt(t.current, v1).toFixed(1), b: +xfmrSecondaryAt(n2, t.current, v1).toFixed(1) })
    }
    if (live.status !== 'done') live.status = running ? 'run' : 'idle'
    const ld = xfmrLoad(n2, v1)
    if (live.status !== 'done') live.readout = [
      `初級 V1 = ${v1.toFixed(0)} V ${v1OK ? '✓' : '（需 120）'}　N1 = ${XFMR.n1}　N2 = ${n2.toFixed(0)}`,
      `次級峰值 V2 = ${v2pk.toFixed(2)} V ${v2OK ? '✓' : '（需 12）'}`,
      `負載 ${XFMR.rLoad} Ω：I2 = ${ld.i2.toFixed(2)} A，I1 = ${ld.i1.toFixed(3)} A（電流比 = N2/N1，降壓→升流）`,
      `功率守恆：P ≈ ${ld.p.toFixed(1)} W（V1·I1 = V2·I2，理想無損）　※波形已放慢 75 倍顯示`,
    ]
    const ph = Math.abs(Math.sin(XFMR.omega * t.current))
    if (priMat.current) priMat.current.emissiveIntensity = 0.15 + ph * Math.min(v1 / 120, 1.2) * 0.7
    if (secMat.current) secMat.current.emissiveIntensity = 0.1 + ph * Math.min(v2pk / 12, 1.3) * 0.7
    if (volt.current) volt.current.rotation.z = Math.min(Math.max(xfmrSecondaryAt(n2, t.current, v1) / 20, -1), 1) * 0.8
  })

  const secTurns = Math.max(4, Math.round((values.xfmr_n2 / 120) * 18))
  const LX = -1.6, RX = 1.6
  return (
    <RoomShell era="xfmr" accent="#6f6fe0" camera={[0, 2.6, 9]}>
      <mesh position={[LX, 1.7, 0]} castShadow><boxGeometry args={[0.32, 3, 0.5]} /><meshStandardMaterial color="#7a828d" metalness={0.85} roughness={0.35} /></mesh>
      <mesh position={[RX, 1.7, 0]} castShadow><boxGeometry args={[0.32, 3, 0.5]} /><meshStandardMaterial color="#7a828d" metalness={0.85} roughness={0.35} /></mesh>
      <mesh position={[0, 3.05, 0]} castShadow><boxGeometry args={[3.5, 0.32, 0.5]} /><meshStandardMaterial color="#7a828d" metalness={0.85} roughness={0.35} /></mesh>
      <mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[3.5, 0.32, 0.5]} /><meshStandardMaterial color="#7a828d" metalness={0.85} roughness={0.35} /></mesh>

      <CoilHelix pos={[LX, 1.7, 0]} axis="y" turns={12} length={2} radius={0.42} tube={0.05} color="#d23b3b" matRef={priMat} />
      <CoilHelix pos={[RX, 1.7, 0]} axis="y" turns={secTurns} length={2} radius={0.42} tube={0.05} color={COPPER} matRef={secMat} />
      <Html position={[LX, 0.0, 0.4]} center distanceFactor={13}><div style={lab('#d23b3b')}>初級 N1={XFMR.n1}</div></Html>
      <Html position={[RX, 0.0, 0.4]} center distanceFactor={13}><div style={lab('#6f6fe0')}>次級 N2</div></Html>

      <SupplyBox pos={[-3.6, 0, -0.4]} ac />
      <Lead points={[[-3.1, 0.84, -0.4], [LX - 0.6, 1.2, 0.4], [LX - 0.42, 1.2, 0]] as P3[]} color="#d23b3b" />
      <Lead points={[[-3.3, 0.84, -0.4], [LX - 0.6, 2.3, 0.4], [LX - 0.42, 2.2, 0]] as P3[]} color="#222" />
      <DialMeter pos={[3.4, 0.7, 0.6]} label="V" color="#6f6fe0" needleRef={volt} />
      <Lead points={[[RX + 0.42, 1.2, 0], [3.4, 1.1, 0.6], [3.4, 1.05, 0.6]] as P3[]} color="#d23b3b" />
      <Lead points={[[RX + 0.42, 2.2, 0], [3.7, 1.0, 0.4], [3.4, 0.35, 0.6]] as P3[]} color="#222" />
    </RoomShell>
  )
}
