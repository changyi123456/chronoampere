// ============================================================================
// CircuitRooms.tsx — Ch1 電路學（實驗器材 + 多重條件 + 拖曳變阻器）
//   LampRoom : 串聯 — 燈絲電阻 R(T) 溫度相依 → 冷開機湧浪電流（非線性元件）。
//   SplitRoom: 並聯 — 含電池內阻：V_bus = ε − r·I_total。
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomShell } from '../components/RoomShell'
import { Lead, DialMeter, BatteryPack, Rheostat, ResistorUnit, BulbLamp, BusBar, Post, Knob } from '../components/lab'
import { useGame } from '../store/store'
import {
  lampCurrentAt, lampPowerAt, lampSteady, lampR, stepFilament,
  splitCurrents, stepFuse, CIRCUIT, SPLIT,
} from '../game/physics'
import { resetLive, pushSample, live } from '../game/live'
import { useSettle } from '../game/useSettle'

type P3 = [number, number, number]
function needleAngle(frac: number) { return (0.5 - Math.min(Math.max(frac, 0), 1)) * 1.6 }

// ---------------------------------------------------------------------------
export function LampRoom() {
  const { values, running, resetToken, setSolved, setRunning, patch, setDragging, dragging } = useGame()
  const T = useRef(CIRCUIT.Tamb)
  const burnt = useRef(false)
  const [burntUI, setBurntUI] = useState(false)
  const t = useRef(0)
  const frame = useRef(0)
  const glass = useRef<THREE.MeshPhysicalMaterial>(null)
  const lightR = useRef<THREE.PointLight>(null)
  const amm = useRef<THREE.Group>(null)
  const settle = useSettle()
  const epsRef = useRef(values.lamp_eps)
  const rvRef = useRef(values.lamp_rv)
  useEffect(() => { epsRef.current = values.lamp_eps; rvRef.current = values.lamp_rv }, [values.lamp_eps, values.lamp_rv])

  useEffect(() => {
    T.current = CIRCUIT.Tamb; burnt.current = false; setBurntUI(false); t.current = 0
    resetLive({ aLabel: '燈絲溫度 T', aColor: '#e0852a', yMin: 0, yMax: 140, yUnit: '°C', targetY: CIRCUIT.Tburn })
  }, [resetToken])

  useFrame(() => {
    const eps = epsRef.current, rv = rvRef.current
    // 瞬時電流/功率（燈絲電阻 R(T) 隨溫度變 → 冷開機有湧浪電流）
    const I = lampCurrentAt(eps, rv, T.current), P = lampPowerAt(eps, rv, T.current)
    const steady = lampSteady(eps, rv) // 穩態自洽解（過關判定用）
    const epsOK = Math.abs(eps - CIRCUIT.epsTarget) <= CIRCUIT.epsTol
    const IOK = Math.abs(steady.I - CIRCUIT.iRated) <= CIRCUIT.tol
    if (running && !burnt.current) {
      T.current = stepFilament(T.current, P, 1 / 60)
      t.current += 1 / 60
      if (T.current >= CIRCUIT.Tburn) { burnt.current = true; setBurntUI(true); live.status = 'fail'; live.readout = ['✗ 燈絲熔斷！電流過大', `I = ${I.toFixed(2)} A`]; setRunning(false) }
      if (!burnt.current && epsOK && IOK && T.current >= 0.9 * steady.T && settle(`${eps}|${rv}`, dragging)) { live.status = 'done'; setSolved('lamp') }
      frame.current++
      if (frame.current % 2 === 0) pushSample({ t: +t.current.toFixed(2), a: +T.current.toFixed(1) })
    }
    if (live.status !== 'fail' && live.status !== 'done') live.status = running ? 'run' : 'idle'
    if (live.status !== 'fail') live.readout = [
      `電源 ε = ${eps.toFixed(1)} V ${epsOK ? '✓' : '（需 8.0）'}`,
      `瞬時電流 I = ${I.toFixed(2)} A → 穩態 ${steady.I.toFixed(2)} A ${IOK ? '✓' : '（需 0.85）'}`,
      `燈絲 R(T) = ${lampR(T.current).toFixed(1)} Ω（冷 ${CIRCUIT.rLamp0} Ω：歐姆定律僅在定溫成立！）`,
      `燈絲溫度 T = ${T.current.toFixed(0)} °C（熔斷 ${CIRCUIT.Tburn}）`,
    ]
    const b = burnt.current ? 0 : Math.min((T.current - CIRCUIT.Tamb) / 55, 1.8)
    if (glass.current) { glass.current.emissiveIntensity = 0.25 + b * 3.4; glass.current.emissive.set(burnt.current ? '#552015' : '#ffd680') }
    if (lightR.current) lightR.current.intensity = b * 75
    if (amm.current) amm.current.rotation.z = needleAngle(I / 1.85)
  })

  const rvFrac = values.lamp_rv / 20
  const sliderX = 0.6 + (rvFrac - 0.5) * 1.4
  return (
    <RoomShell era="lamp" accent="#e0852a" camera={[0, 2.7, 8.5]}>
      <BatteryPack pos={[-3.4, 0, 0]} />
      <DialMeter pos={[-1.4, 0.6, 0.9]} label="A" color="#e0852a" needleRef={amm} />
      <Rheostat pos={[0.6, 0.32, 0]} frac={rvFrac} onFrac={(f) => patch({ lamp_rv: f * 20 })} onDragState={setDragging} />
      <BulbLamp pos={[2.7, 0, 0]} glassRef={glass} lightRef={lightR} broken={burntUI} />
      <Knob pos={[-3.4, 1.0, 2.5]} value={values.lamp_eps} min={1} max={12} step={0.1} label="電源 ε" unit="V" accent="#e0852a" onChange={(v) => patch({ lamp_eps: v })} onDragState={setDragging} />
      {/* 接線：電池＋(-3.9) → 電流表 → 變阻器 → 燈泡 → 電池－(-2.9) */}
      <Lead points={[[-3.9, 0.78, 0], [-2.6, 0.5, 0.6], [-1.7, 0.42, 0.9]] as P3[]} color="#d23b3b" />
      <Lead points={[[-1.1, 0.42, 0.9], [-0.3, 0.5, 0], [-0.3, 0.66, 0]] as P3[]} color="#d23b3b" />
      <Lead points={[[sliderX, 0.62, 0], [1.7, 0.85, 0], [2.52, 0.5, 0.2]] as P3[]} color="#d23b3b" />
      <Lead points={[[2.88, 0.5, 0.2], [2.88, 1.95, 0.3], [-2.9, 1.95, 0.3], [-2.9, 0.78, 0]] as P3[]} color="#222" />
    </RoomShell>
  )
}

// ---------------------------------------------------------------------------
export function SplitRoom() {
  const { values, running, resetToken, setSolved, setRunning, dragging, patch, setDragging } = useGame()
  const Tf = useRef(SPLIT.Tamb)
  const blown = useRef(false)
  const [blownUI, setBlownUI] = useState(false)
  const t = useRef(0)
  const frame = useRef(0)
  const a1 = useRef<THREE.Group>(null)
  const a2 = useRef<THREE.Group>(null)
  const aMain = useRef<THREE.Group>(null)
  const settle = useSettle()
  const epsRef = useRef(values.split_eps)
  const r2Ref = useRef(values.split_r2)
  useEffect(() => { epsRef.current = values.split_eps; r2Ref.current = values.split_r2 }, [values.split_eps, values.split_r2])

  useEffect(() => {
    Tf.current = SPLIT.Tamb; blown.current = false; setBlownUI(false); t.current = 0
    resetLive({ aLabel: '維生支路 I2', aColor: '#2e9e6b', bLabel: '總電流 I_total', bColor: '#d23b3b', yMin: 0, yMax: 4, yUnit: 'A', targetY: SPLIT.i2Target })
  }, [resetToken])

  useFrame(() => {
    const { i1, i2, iTotal } = splitCurrents(epsRef.current, r2Ref.current)
    const i2OK = Math.abs(i2 - SPLIT.i2Target) <= SPLIT.tol
    const i1OK = i1 >= SPLIT.i1Lo && i1 <= SPLIT.i1Hi
    if (running && !blown.current) {
      Tf.current = stepFuse(Tf.current, iTotal, 1 / 60)
      t.current += 1 / 60
      if (Tf.current >= SPLIT.Tblow) { blown.current = true; setBlownUI(true); live.status = 'fail'; live.readout = ['✗ 主保險絲熔斷！總電流過大', `I_total = ${iTotal.toFixed(2)} A`]; setRunning(false) }
      if (!blown.current && i2OK && i1OK && iTotal <= SPLIT.fuse && t.current >= 2 && settle(`${epsRef.current}|${r2Ref.current}`, dragging)) { live.status = 'done'; setSolved('split') }
      frame.current++
      if (frame.current % 2 === 0) pushSample({ t: +t.current.toFixed(2), a: +i2.toFixed(3), b: +iTotal.toFixed(3) })
    }
    if (live.status !== 'fail' && live.status !== 'done') live.status = running ? 'run' : 'idle'
    const vBus = splitCurrents(epsRef.current, r2Ref.current).vBus
    if (live.status !== 'fail') live.readout = [
      `端電壓 V = ${vBus.toFixed(2)} V（= ε − r·I：內阻 ${SPLIT.rInternal} Ω 吃掉 ${(epsRef.current - vBus).toFixed(2)} V）`,
      `照明 I1 = ${i1.toFixed(2)} A ${i1OK ? '✓' : `（${SPLIT.i1Lo}-${SPLIT.i1Hi}）`}`,
      `維生 I2 = ${i2.toFixed(2)} A ${i2OK ? '✓' : '（需 0.60）'}`,
      `總電流 = ${iTotal.toFixed(2)} A（保險絲 ${SPLIT.fuse}）　保險絲 ${Tf.current.toFixed(0)} °C`,
    ]
    if (a1.current) a1.current.rotation.z = needleAngle(i1 / 2)
    if (a2.current) a2.current.rotation.z = needleAngle(i2 / 2)
    if (aMain.current) aMain.current.rotation.z = needleAngle(iTotal / 3)
  })

  const { i1 } = splitCurrents(values.split_eps, values.split_r2)
  const TOP = 1.9, BOT = 0.6, XL = -3, XR = 2.6, b1x = 0, b2x = 2
  return (
    <RoomShell era="split" accent="#e0852a" camera={[0, 2.7, 8.5]}>
      <BusBar a={[XL, TOP, 0]} b={[XR, TOP, 0]} />
      <BusBar a={[XL, BOT, 0]} b={[XR, BOT, 0]} />
      {/* 電池＋接上排、－接下排 */}
      <BatteryPack pos={[-4, 0, 0]} />
      <Lead points={[[-4.5, 0.78, 0], [XL, 1.3, 0], [XL, TOP, 0]] as P3[]} color="#d23b3b" />
      <Lead points={[[-3.5, 0.78, 0], [-3.4, 0.4, 0.4], [XL, BOT, 0]] as P3[]} color="#222" />
      <DialMeter pos={[-1.6, 2.55, 0.4]} label="A" color="#d23b3b" needleRef={aMain} />
      {/* 保險絲（上排靠電池端） */}
      <mesh position={[XL + 0.8, TOP, 0]}><cylinderGeometry args={[0.12, 0.12, 0.7, 12]} /><meshStandardMaterial color={blownUI ? '#d23b3b' : '#cfd6de'} emissive={blownUI ? '#d23b3b' : '#000'} emissiveIntensity={blownUI ? 1.2 : 0} /></mesh>
      {/* 支路1：照明固定電阻 R1（垂直橋接兩排） */}
      <group position={[b1x, (TOP + BOT) / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <ResistorUnit pos={[0, 0, 0]} label="R1 照明" glow={Math.min(i1 / 0.6, 1) * 0.8} />
      </group>
      <Lead points={[[b1x, TOP, 0], [b1x, TOP - 0.2, 0]] as P3[]} color="#d23b3b" />
      <Lead points={[[b1x, BOT, 0], [b1x, BOT + 0.2, 0]] as P3[]} color="#222" />
      <DialMeter pos={[b1x - 1, 1.25, 0.5]} label="A1" color="#2e9e6b" needleRef={a1} />
      {/* 支路2：可變電阻 R2（實體滑動變阻器，直接拖曳滑塊調整） */}
      <Rheostat pos={[b2x, 1.05, 0.6]} frac={Math.min(Math.max((values.split_r2 - 2) / 38, 0), 1)} length={1.6} label="R2"
        onFrac={(fr) => patch({ split_r2: 2 + fr * 38 })} onDragState={setDragging} />
      <Lead points={[[b2x, TOP, 0], [b2x, 1.4, 0.4], [b2x - 0.7, 1.1, 0.6]] as P3[]} color="#d23b3b" />
      <Lead points={[[b2x, BOT, 0], [b2x, 0.8, 0.4], [b2x + 0.7, 1.1, 0.6]] as P3[]} color="#222" />
      <DialMeter pos={[b2x + 1, 1.25, 0.5]} label="A2" color="#2e9e6b" needleRef={a2} />
      <Post pos={[XR, TOP, 0]} />
      <Post pos={[XR, BOT, 0]} />
      <Knob pos={[-3.4, 1.0, 2.6]} value={values.split_eps} min={1} max={24} step={0.1} label="電源 ε" unit="V" accent="#e0852a" onChange={(v) => patch({ split_eps: v })} onDragState={setDragging} />
    </RoomShell>
  )
}
