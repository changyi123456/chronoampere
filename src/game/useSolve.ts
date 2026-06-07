// ============================================================================
// useSolve.ts — 多重條件判定：每關需「同時」滿足數個物理條件。
// 回傳條件清單 conds（每條 label + ok），HUD 即時勾選；
// targetMet = 所有條件皆 ok（靜態，由滑桿值決定）。
// 各關的「動態」條件（升溫穩定/存活/命中/通電到位）仍由關卡自行 AND 進去。
// ============================================================================
import type { ChallengeId } from '../story/script'
import {
  lampCurrent, splitCurrents, emRadius, crtDeflect, emfMax, v2Peak,
  CIRCUIT, SPLIT, EM, CRT, INDUCTION, XFMR,
} from './physics'

export interface Cond { label: string; ok: boolean }
export interface SolveResult {
  conds: Cond[]
  targetMet: boolean
  sync: number
}

function pack(conds: Cond[]): SolveResult {
  const met = conds.filter((c) => c.ok).length
  return { conds, targetMet: met === conds.length, sync: Math.round((met / conds.length) * 100) }
}

export function getSolve(id: ChallengeId, v: Record<string, number>): SolveResult {
  switch (id) {
    case 'lamp': {
      const I = lampCurrent(v.lamp_eps, v.lamp_rv)
      return pack([
        { label: `電源 ε = ${CIRCUIT.epsTarget} V`, ok: Math.abs(v.lamp_eps - CIRCUIT.epsTarget) <= CIRCUIT.epsTol },
        { label: `主燈電流 I = ${CIRCUIT.iRated} A`, ok: Math.abs(I - CIRCUIT.iRated) <= CIRCUIT.tol },
      ])
    }
    case 'split': {
      const { i1, i2, iTotal } = splitCurrents(v.split_eps, v.split_r2)
      return pack([
        { label: `維生 I2 = ${SPLIT.i2Target} A`, ok: Math.abs(i2 - SPLIT.i2Target) <= SPLIT.tol },
        { label: `照明 I1 在 ${SPLIT.i1Lo}–${SPLIT.i1Hi} A`, ok: i1 >= SPLIT.i1Lo && i1 <= SPLIT.i1Hi },
        { label: `總電流 ≤ ${SPLIT.fuse} A`, ok: iTotal <= SPLIT.fuse },
      ])
    }
    case 'cyclo': {
      const r = emRadius(v.emacc_V, v.emacc_I)
      return pack([
        { label: `加速電壓 V = ${EM.VaccTarget} V`, ok: Math.abs(v.emacc_V - EM.VaccTarget) <= EM.VaccTol },
        { label: `電子束半徑 r = ${(EM.rTarget * 100).toFixed(1)} cm`, ok: Math.abs(r - EM.rTarget) <= EM.rTol },
      ])
    }
    case 'maglock': {
      const yE = crtDeflect(v.crt_Va, v.crt_Vd, 0).totalY
      const yT = crtDeflect(v.crt_Va, v.crt_Vd, v.crt_B).totalY
      return pack([
        { label: `加速電壓 Va = ${CRT.VaTarget} V`, ok: Math.abs(v.crt_Va - CRT.VaTarget) <= CRT.VaTol },
        { label: `電場分量 y_E = ${(CRT.yE_target * 100).toFixed(0)} cm`, ok: Math.abs(yE - CRT.yE_target) <= CRT.yE_tol },
        { label: `螢幕總偏轉 y = +${(CRT.yT_target * 100).toFixed(0)} cm`, ok: Math.abs(yT - CRT.yT_target) <= CRT.yT_tol },
      ])
    }
    case 'dynamo': {
      const em = emfMax(v.dynamo_N, v.dynamo_w)
      return pack([
        { label: `峰值 ε_max = ${INDUCTION.targetEmf} V`, ok: Math.abs(em - INDUCTION.targetEmf) <= INDUCTION.tol },
        { label: `頻率 ω 在 ${INDUCTION.wLo}–${INDUCTION.wHi} rad/s`, ok: v.dynamo_w >= INDUCTION.wLo && v.dynamo_w <= INDUCTION.wHi },
      ])
    }
    case 'xfmr': {
      const v2 = v2Peak(v.xfmr_n2, v.xfmr_v1)
      return pack([
        { label: `初級 V1 = ${XFMR.v1Target} V（市電）`, ok: Math.abs(v.xfmr_v1 - XFMR.v1Target) <= XFMR.v1Tol },
        { label: `次級 V2 = ${XFMR.v2Target} V`, ok: Math.abs(v2 - XFMR.v2Target) <= XFMR.tol },
      ])
    }
  }
}
