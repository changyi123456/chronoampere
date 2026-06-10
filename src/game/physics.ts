// ============================================================================
// physics.ts — 六關「真實時間演化」物理引擎（純函式，無 React、無副作用）
// 本版升級：R(T) 燈絲、並聯內阻、解析指數更新、e/m 測量不確定度、變壓器負載
// ============================================================================

export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v))

export function syncPercent(measured: number, target: number, scale: number) {
  return Math.round(clamp(1 - Math.abs(measured - target) / scale, 0, 1) * 100)
}

export const DT = 1 / 60

/** 一階線性 ODE 的解析指數更新：dx/dt = (x_inf − x)/τ → 精確解 */
export function relax(x: number, xInf: number, tau: number, dt: number) {
  return xInf + (x - xInf) * Math.exp(-dt / tau)
}

// ===========================================================================
// Ch1-A 主照明：歐姆定律 + 焦耳熱 + 溫度相依燈絲電阻 R(T)
// ===========================================================================
export const CIRCUIT = {
  rInternal: 0.5,
  rLamp0: 6.0,
  alpha: 0.004,
  iRated: 0.85,
  tol: 0.03,
  epsTarget: 8.0,
  epsTol: 0.2,
  Tamb: 25,
  kCool: 0.079,
  Cheat: 0.24,
  Tburn: 120,
  epsRange: [1, 12] as const,
  rvRange: [0, 20] as const,
}

export function lampR(T: number) {
  return CIRCUIT.rLamp0 * (1 + CIRCUIT.alpha * (T - CIRCUIT.Tamb))
}
export function lampCurrentAt(eps: number, rv: number, T: number) {
  return eps / (CIRCUIT.rInternal + rv + lampR(T))
}
export function lampPowerAt(eps: number, rv: number, T: number) {
  const I = lampCurrentAt(eps, rv, T)
  return I * I * lampR(T)
}
export function lampSteady(eps: number, rv: number) {
  let T = CIRCUIT.Tamb
  for (let i = 0; i < 60; i++) {
    const P = lampPowerAt(eps, rv, T)
    T = CIRCUIT.Tamb + P / CIRCUIT.kCool
  }
  const I = lampCurrentAt(eps, rv, T)
  return { I, T, P: I * I * lampR(T), R: lampR(T) }
}
export function stepFilament(T: number, P: number, dt: number) {
  const Tinf = CIRCUIT.Tamb + P / CIRCUIT.kCool
  return relax(T, Tinf, CIRCUIT.Cheat / CIRCUIT.kCool, dt)
}

// ===========================================================================
// Ch1-B 配電分流：並聯 + 電池內阻 + 保險絲
// ===========================================================================
export const SPLIT = {
  rInternal: 0.5,
  r1: 10,
  i2Target: 0.6,
  fuse: 3.0,
  tol: 0.02,
  i1Lo: 0.45,
  i1Hi: 0.75,
  Tamb: 25,
  c1: 3.333,
  c2: 0.5,
  C: 0.5,
  Tblow: 100,
  epsRange: [1, 24] as const,
  r2Range: [2, 40] as const,
}
export function splitCurrents(eps: number, r2: number) {
  const Rp = (SPLIT.r1 * r2) / (SPLIT.r1 + r2)
  const iTotal = eps / (SPLIT.rInternal + Rp)
  const vBus = iTotal * Rp
  return { i1: vBus / SPLIT.r1, i2: vBus / r2, iTotal, vBus }
}
export function stepFuse(T: number, iTotal: number, dt: number) {
  const Tinf = SPLIT.Tamb + (SPLIT.c1 * iTotal * iTotal) / SPLIT.c2
  return relax(T, Tinf, SPLIT.C / SPLIT.c2, dt)
}

// ===========================================================================
// Ch2-A 迴旋偵測艙（Boris 旋轉，|v| 守恆）
// ===========================================================================
export const MAGNET = {
  q: 1,
  m: 1,
  target: { x: 3, y: -2 } as const,
  gateTol: 0.4,
  v0: 6,
  vSelTol: 0.3,
  vRange: [1, 10] as const,
  bRange: [0.2, 5] as const,
}
export function requiredRadius() {
  const { x, y } = MAGNET.target
  return -(x * x + y * y) / (2 * y)
}
export function cycloRadius(v: number, B: number) {
  return (MAGNET.m * v) / (MAGNET.q * B)
}
export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
}
export function stepLorentz(p: Particle, B: number, dt: number): Particle {
  const wc = (MAGNET.q * B) / MAGNET.m
  const a = wc * dt
  const c = Math.cos(a)
  const s = Math.sin(a)
  const vx = p.vx * c + p.vy * s
  const vy = -p.vx * s + p.vy * c
  return { x: p.x + vx * dt, y: p.y + vy * dt, vx, vy }
}

// ===========================================================================
// Ch2-B 電磁艙門鎖：RL 暫態（解析指數更新）
// ===========================================================================
export const MAGLOCK = {
  Rcoil: 2,
  L: 0.8,
  k: 0.05,
  bTarget: 6.0,
  tol: 0.2,
  iMax: 3,
  VRange: [1, 12] as const,
  nRange: [5, 50] as const,
}
export function maglockSteadyB(V: number, n: number) {
  return (MAGLOCK.k * n * V) / MAGLOCK.Rcoil
}
export function maglockB(i: number, n: number) {
  return MAGLOCK.k * n * i
}
export function stepRL(i: number, V: number, dt: number) {
  return relax(i, V / MAGLOCK.Rcoil, MAGLOCK.L / MAGLOCK.Rcoil, dt)
}

// ===========================================================================
// Ch3-A 主發電機：法拉第定律（ε 與 φ 相位差 90°）
// ===========================================================================
export const INDUCTION = {
  B: 0.5,
  A: 0.02,
  targetEmf: 10.5,
  tol: 0.3,
  wLo: 9,
  wHi: 11,
  nRange: [10, 200] as const,
  wRange: [1, 30] as const,
  fluxPlotScale: 8,
}
export function emfMax(N: number, omega: number) {
  return N * INDUCTION.B * INDUCTION.A * omega
}
export function emfAt(N: number, omega: number, t: number) {
  return emfMax(N, omega) * Math.sin(omega * t)
}
export function fluxAt(N: number, omega: number, t: number) {
  return N * INDUCTION.B * INDUCTION.A * Math.cos(omega * t)
}

// ===========================================================================
// Ch3-B 變壓器 + 次級負載（電流比 / 功率守恆）
// ===========================================================================
export const XFMR = {
  v1pk: 120,
  n1: 240,
  v2Target: 12,
  tol: 0.4,
  v1Target: 120,
  v1Tol: 5,
  v1Range: [90, 140] as const,
  omega: Math.PI * 2 * 0.8,
  n2Range: [5, 120] as const,
  rLoad: 6,
}
export function v2Peak(n2: number, v1: number = XFMR.v1pk) {
  return (v1 * n2) / XFMR.n1
}
export function xfmrPrimaryAt(t: number, v1: number = XFMR.v1pk) {
  return v1 * Math.sin(XFMR.omega * t)
}
export function xfmrSecondaryAt(n2: number, t: number, v1: number = XFMR.v1pk) {
  return v2Peak(n2, v1) * Math.sin(XFMR.omega * t)
}
export function xfmrLoad(n2: number, v1: number = XFMR.v1pk) {
  const v2 = v2Peak(n2, v1)
  const i2 = v2 / XFMR.rLoad
  const i1 = (i2 * n2) / XFMR.n1
  const p = (v2 * i2) / 2
  return { v2, i2, i1, p }
}

// ===========================================================================
// Ch2 #3：電子荷質比 e/m（含測量不確定度 + 多組數據平均，COV）
// ===========================================================================
export const EM = {
  e: 1.602e-19,
  m: 9.109e-31,
  coilK: 0.00078,
  VaccRange: [50, 300] as const,
  IcoilRange: [0.5, 3.0] as const,
  VaccTarget: 200,
  VaccTol: 5,
  rTarget: 0.05,
  rTol: 0.0015,
  readNoise: 0.02,
  samplesNeeded: 3,
  ratioTrue: 1.7588e11,
  ratioTolFrac: 0.1,
}
export function emVelocity(V: number) { return Math.sqrt((2 * EM.e * V) / EM.m) }
export function emField(I: number) { return EM.coilK * I }
export function emRadius(V: number, I: number) {
  const B = emField(I)
  return B > 0 ? (EM.m * emVelocity(V)) / (EM.e * B) : Infinity
}
export function emRatio(V: number, I: number, r: number) {
  const B = emField(I)
  return B > 0 && r > 0 ? (2 * V) / (B * B * r * r) : 0
}
export function emMeasureRadius(V: number, I: number, rand: number = Math.random()) {
  return emRadius(V, I) * (1 + (rand * 2 - 1) * EM.readNoise)
}
export interface EmSample { V: number; I: number; r: number; est: number }
export function emEstimate(samples: EmSample[]): number | null {
  if (samples.length === 0) return null
  return samples.reduce((s, p) => s + p.est, 0) / samples.length
}
export function emMeasurementOK(samples: EmSample[]): boolean {
  const est = emEstimate(samples)
  return samples.length >= EM.samplesNeeded && est !== null &&
    Math.abs(est - EM.ratioTrue) / EM.ratioTrue <= EM.ratioTolFrac
}

// ===========================================================================
// Ch2 #4：CRT 偏轉（含湯姆森平衡法 v = E/B；忽略邊緣場）
// ===========================================================================
export const CRT = {
  e: 1.602e-19,
  m: 9.109e-31,
  d: 0.05,
  L: 0.10,
  D: 0.20,
  VaRange: [500, 5000] as const,
  VdRange: [-500, 500] as const,
  BmRange: [-2, 2] as const,
  VaTarget: 2000,
  VaTol: 100,
  yTol: 0.003,
  VdMin: 200,
  BminmT: 0.15,
  yE_target: -0.03,
  yE_tol: 0.0025,
  yT_target: 0.01,
  yT_tol: 0.003,
  balanceTol: 0.002,
}
export function crtVx(Va: number) { return Math.sqrt((2 * CRT.e * Va) / CRT.m) }
export function crtDeflect(Va: number, Vd: number, Bmilli: number) {
  const vx = crtVx(Va)
  const Bt = Bmilli * 1e-3
  const aE = -(CRT.e * (Vd / CRT.d)) / CRT.m
  const aM = (CRT.e * vx * Bt) / CRT.m
  const ay = aE + aM
  const t1 = CRT.L / vx
  const y1 = 0.5 * ay * t1 * t1
  const vy1 = ay * t1
  const t2 = CRT.D / vx
  const y2 = vy1 * t2
  return { vx, ay, totalY: y1 + y2 }
}
export function crtBalance(Va: number, Vd: number, Bmilli: number): number | null {
  if (Math.abs(Vd) < CRT.VdMin || Math.abs(Bmilli) < CRT.BminmT) return null
  const { totalY } = crtDeflect(Va, Vd, Bmilli)
  if (Math.abs(totalY) > CRT.balanceTol) return null
  const E = Math.abs(Vd) / CRT.d
  const B = Math.abs(Bmilli) * 1e-3
  return E / B
}
