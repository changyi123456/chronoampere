// ============================================================================
// live.ts — 高頻「即時數據匯流排」單例（模組層級，非 React Context）。
// 關卡（在 R3F Canvas 內）每幀寫入；示波器/讀數（在 Canvas 外的 HUD）每幀讀取。
// 用模組單例而非 Context，可安全跨越 R3F 的 reconciler 邊界。
// ============================================================================

export interface ScopeConfig {
  aLabel: string
  aColor: string
  bLabel?: string
  bColor?: string
  yMin: number
  yMax: number
  yUnit: string
  targetY?: number // 在示波圖上畫一條目標水平線
}

export interface Sample {
  t: number
  a: number
  b?: number
}

export type SimStatus = 'idle' | 'run' | 'fail' | 'done'

export interface LiveData {
  config: ScopeConfig
  samples: Sample[]
  readout: string[] // 即時讀數文字（每行一條）
  status: SimStatus
}

const MAX_SAMPLES = 240

export const live: LiveData = {
  config: { aLabel: '', aColor: '#5eead4', yMin: 0, yMax: 1, yUnit: '' },
  samples: [],
  readout: [],
  status: 'idle',
}

/** 進入/重置關卡時呼叫：設定示波器座標並清空緩衝 */
export function resetLive(config: ScopeConfig) {
  live.config = config
  live.samples = []
  live.readout = []
  live.status = 'idle'
}

/** 每幀推入一筆樣本（環形緩衝，上限 240 點） */
export function pushSample(s: Sample) {
  live.samples.push(s)
  if (live.samples.length > MAX_SAMPLES) live.samples.shift()
}
