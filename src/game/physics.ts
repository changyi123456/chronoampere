// ============================================================================
// physics.ts — 六關「真實時間演化」物理引擎（純函式，無 React、無副作用）
// 方法論依 PSG：固定時間步、Euler/Verlet/Boris 積分、能量/守恆可檢查。
// 每個 step* 函式接收「目前狀態 + 參數 + dt」回傳「下一刻狀態」。
//   Ch1 電路：焦耳熱燈絲、保險絲 I²t
//   Ch2 磁效應：勞侖茲力迴旋(Boris)、螺線管 RL 暫態
//   Ch3 電磁感應：交流發電機、變壓器交流波形
// ============================================================================

export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v))

/** 同步率（0~100）：量測值越接近 target、越接近 100 */
export function syncPercent(measured: number, target: number, scale: number) {
  return Math.round(clamp(1 - Math.abs(measured - target) / scale, 0, 1) * 100)
}

export const DT = 1 / 60 // 固定時間步（秒）

// ===========================================================================
// Ch1-A 主照明：歐姆定律 + 焦耳熱燈絲
//   穩態電流 I = ε /(r + Rv + R_lamp)；燈絲功率 P = I²R_lamp（焦耳定律）
//   燈絲溫度演化：C·dT/dt = P_in − k·(T − T_amb)   （產熱 − 牛頓冷卻）
//   T 超過 T_burn → 燈絲熔斷。額定電流 0.85 A。
// ===========================================================================
export const CIRCUIT = {
  rInternal: 0.5,
  rLamp: 6.0,
  iRated: 0.85,
  tol: 0.03,
  epsTarget: 8.0,
  epsTol: 0.2,
  // 熱模型
  Tamb: 25,
  kCool: 0.079, // 散熱係數 → 額定時平衡溫 ≈ 80°C
  Cheat: 0.24, // 熱容 → 時間常數 τ = C/k ≈ 3 s
  Tburn: 120,
  epsRange: [1, 12] as const,
  rvRange: [0, 20] as const,
}

export function lampCurrent(eps: number, rv: number) {
  return eps / (CIRCUIT.rInternal + rv + CIRCUIT.rLamp)
}
export function lampPower(eps: number, rv: number) {
  const I = lampCurrent(eps, rv)
  return I * I * CIRCUIT.rLamp
}
export function lampEquilibriumT(P: number) {
  return CIRCUIT.Tamb + P / CIRCUIT.kCool
}
/** 燈絲溫度一步演化（Euler） */
export function stepFilament(T: number, P: number, dt: number) {
  const dT = ((P - CIRCUIT.kCool * (T - CIRCUIT.Tamb)) / CIRCUIT.Cheat) * dt
  return T + dT
}

// ===========================================================================
// Ch1-B 配電分流：並聯 + 克希何夫節點定則 + 保險絲 I²t
//   I1 = ε/R1（照明）、I2 = ε/R2（維生）、I_total = I1 + I2
//   保險絲熱：C·dT/dt = c1·I_total² − c2·(T − T_amb)；T > T_blow → 熔斷
//   目標：I2 = 0.60 A 且保險絲存活。
// ===========================================================================
export const SPLIT = {
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
  const i1 = eps / SPLIT.r1
  const i2 = eps / r2
  return { i1, i2, iTotal: i1 + i2 }
}
export function stepFuse(T: number, iTotal: number, dt: number) {
  const dT = ((SPLIT.c1 * iTotal * iTotal - SPLIT.c2 * (T - SPLIT.Tamb)) / SPLIT.C) * dt
  return T + dT
}

// ===========================================================================
// Ch2-A 迴旋偵測艙：帶電質點在均勻磁場中的勞侖茲力（Boris 旋轉，|v| 守恆）
//   迴旋角頻 ω_c = qB/m；每步將速度順時針旋轉 ω_c·dt，再平移。
//   迴旋半徑 r = m v /(qB)。正電荷自原點以 +x 入射，B 沿 +z。
//   目標光門 (3, −2)：所需半徑 r_req = 3.25。
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
  return -(x * x + y * y) / (2 * y) // = 3.25
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
/** 一步 Boris：先把速度順時針旋轉 ω_c·dt，再用新速度平移（|v| 嚴格不變） */
export function stepLorentz(p: Particle, B: number, dt: number): Particle {
  const wc = (MAGNET.q * B) / MAGNET.m // 迴旋角頻
  const a = wc * dt // 本步旋轉角（順時針）
  const c = Math.cos(a)
  const s = Math.sin(a)
  // 順時針旋轉：vx' = vx cos + vy sin ; vy' = −vx sin + vy cos
  const vx = p.vx * c + p.vy * s
  const vy = -p.vx * s + p.vy * c
  return { x: p.x + vx * dt, y: p.y + vy * dt, vx, vy }
}

// ===========================================================================
// Ch2-B 電磁艙門鎖：螺線管 + RL 暫態 + 安培右手定則
//   通電後電流指數上升：L·di/dt = V − i·R  → 穩態 i = V/R
//   螺線管磁場 B = k·n·i（k 為縮放後 μ₀）。穩態 B = k·n·V/R。
//   極性由電流環繞方向（右手定則）決定，需 N 極朝門板。
// ===========================================================================
export const MAGLOCK = {
  Rcoil: 2,
  L: 0.8, // 時間常數 τ = L/R = 0.4 s
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
  return i + ((V - i * MAGLOCK.Rcoil) / MAGLOCK.L) * dt
}

// ===========================================================================
// Ch3-A 主發電機：交流發電機（法拉第定律）
//   φ(t) = B·A·cos(θ)，θ = ωt
//   ε(t) = −N dφ/dt = N B A ω sin(ωt)，峰值 ε_max = N B A ω
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
// Ch3-B 感應變壓配電：理想變壓器（交流）
//   V2/V1 = N2/N1 → 次級峰值 V2_pk = V1_pk · N2/N1
//   初級市電固定頻率；初/次級同相（理想），波形即時繪出。
// ===========================================================================
export const XFMR = {
  v1pk: 120,
  n1: 240,
  v2Target: 12,
  tol: 0.4,
  v1Target: 120,
  v1Tol: 5,
  v1Range: [90, 140] as const,
  omega: Math.PI * 2 * 0.8, // 顯示用頻率
  n2Range: [5, 120] as const,
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

// ===========================================================================
// Ch2 #3：電子荷質比 e/m（湯姆森裝置：亥姆霍茲線圈 + 電子圓形束）
//   加速：v = √(2eV/m)；線圈磁場 B = k·I；迴旋半徑 r = m v /(e B)
//   荷質比 e/m = 2V /(B² r²)（理論值 1.76×10¹¹ C/kg）
// ===========================================================================
export const EM = {
  e: 1.602e-19,
  m: 9.109e-31,
  coilK: 0.00078, // 亥姆霍茲線圈每安培磁場 (T/A)
  VaccRange: [50, 300] as const,
  IcoilRange: [0.5, 3.0] as const,
  VaccTarget: 200, // 校準加速電壓
  VaccTol: 5,
  rTarget: 0.05, // 目標半徑 5 cm
  rTol: 0.0015,
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

// ===========================================================================
// Ch2 #4：陰極射線管 CRT 偏轉（電場板 + 磁場）
//   加速：vx = √(2e·Va/m)
//   板間電場 E = Vd/d → a_E = −eE/m；磁場 → a_M = e·vx·B/m；ay = a_E + a_M
//   板內類平拋 y1 = ½ ay t1²（t1=L/vx），出板後直線 y2 = (ay t1)·t2（t2=D/vx）
//   螢幕總偏轉 y = y1 + y2；電場與磁場可互相抵消（湯姆森平衡法）
// ===========================================================================
export const CRT = {
  e: 1.602e-19,
  m: 9.109e-31,
  d: 0.05, // 板間距 (m)
  L: 0.10, // 板長 (m)
  D: 0.20, // 板到螢幕 (m)
  VaRange: [500, 5000] as const,
  VdRange: [-500, 500] as const,
  BmRange: [-2, 2] as const, // 磁場 (mT)
  VaTarget: 2000,
  VaTol: 100,
  yTol: 0.003, // 置中容差 (m, 約 0.3cm)
  VdMin: 200, // 「電場作用中」門檻 (V)
  BminmT: 0.15, // 「磁場作用中」門檻 (mT)
  yE_target: -0.03, // 電場單獨偏轉目標 (m，-3cm) → 由 Vd 決定
  yE_tol: 0.0025,
  yT_target: 0.01, // 螢幕總偏轉目標 (m，+1cm) → 磁場須蓋過電場使其反向
  yT_tol: 0.003,
}
export function crtVx(Va: number) { return Math.sqrt((2 * CRT.e * Va) / CRT.m) }
/** Bmilli 為毫特斯拉(mT)。回傳 {vx, ay, totalY(m)} */
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
