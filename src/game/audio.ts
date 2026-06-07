// ============================================================================
// audio.ts — 科幻風 WebAudio 音效引擎（程序式合成 + 環境背景音樂）。
// 全程序式：噪聲掃頻、FM 鐘聲、去諧疊音、回授延遲尾音（太空殘響感）。
// 須在使用者手勢（開始鍵）後呼叫 unlock() / startBgm()（瀏覽器自動播放限制）。
// ============================================================================
type Ctx = AudioContext

let ctx: Ctx | null = null
let master: GainNode | null = null
let verbIn: GainNode | null = null      // 殘響送入點（回授延遲網路）
let muted = false
let bgmStarted = false
let droneGain: GainNode | null = null
let bgmEl: HTMLAudioElement | null = null
let noiseBuf: AudioBuffer | null = null

function ensure(): Ctx {
  if (!ctx) {
    const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 1
    master.connect(ctx.destination)

    // 太空殘響：兩條回授延遲 + 低通，營造冷冽科幻尾音
    verbIn = ctx.createGain()
    verbIn.gain.value = 0.5
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'; lp.frequency.value = 3200
    ;[0.17, 0.31].forEach((dt) => {
      const dl = ctx!.createDelay(1.0)
      dl.delayTime.value = dt
      const fb = ctx!.createGain()
      fb.gain.value = 0.34
      verbIn!.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(lp)
    })
    lp.connect(master)

    // 預生白噪聲緩衝
    const n = ctx.sampleRate * 1.2
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
  }
  return ctx
}

export function unlock() {
  const c = ensure()
  if (c.state === 'suspended') c.resume()
}

// ── 合成基元 ───────────────────────────────────────────────────────────────
// 單一震盪音（可選 FM 調變、滑音、去諧、殘響送出）
function tone(o: {
  freq: number; dur?: number; type?: OscillatorType; vol?: number
  slideTo?: number; delay?: number; detune?: number
  fm?: { ratio: number; depth: number }; verb?: number; attack?: number
}) {
  if (muted || !master || !ctx) return
  const { freq, dur = 0.14, type = 'sine', vol = 0.2, slideTo, delay = 0, detune = 0, fm, verb = 0, attack = 0.008 } = o
  const t0 = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  osc.type = type
  osc.detune.value = detune
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  // FM：調變震盪器驅動主頻
  if (fm) {
    const m = ctx.createOscillator()
    m.frequency.value = freq * fm.ratio
    const mg = ctx.createGain()
    mg.gain.value = freq * fm.depth
    m.connect(mg).connect(osc.frequency)
    m.start(t0); m.stop(t0 + dur + 0.05)
  }
  osc.connect(g).connect(master)
  if (verb > 0 && verbIn) { const vg = ctx.createGain(); vg.gain.value = verb; g.connect(vg).connect(verbIn) }
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

// 噪聲掃頻（帶通），科幻「whoosh / 電弧」質感
function noiseSweep(o: { dur?: number; from?: number; to?: number; q?: number; vol?: number; delay?: number; verb?: number }) {
  if (muted || !master || !ctx || !noiseBuf) return
  const { dur = 0.3, from = 400, to = 3000, q = 6, vol = 0.18, delay = 0, verb = 0 } = o
  const t0 = ctx.currentTime + delay
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'; bp.Q.value = q
  bp.frequency.setValueAtTime(from, t0)
  bp.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.25)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(bp).connect(g).connect(master)
  if (verb > 0 && verbIn) { const vg = ctx.createGain(); vg.gain.value = verb; g.connect(vg).connect(verbIn) }
  src.start(t0); src.stop(t0 + dur + 0.05)
}

export type Sfx = 'click' | 'open' | 'close' | 'enter' | 'power' | 'success' | 'fail' | 'correct' | 'wrong' | 'fragment' | 'reveal'

export function sfx(name: Sfx) {
  if (muted) return
  ensure()
  switch (name) {
    // UI：清脆的高頻數位「滴」+ 微噪聲觸點
    case 'click':
      tone({ freq: 1180, dur: 0.05, type: 'square', vol: 0.06, slideTo: 1500 })
      noiseSweep({ dur: 0.04, from: 2600, to: 5200, q: 3, vol: 0.05 })
      break
    // 介面開啟：上升掃頻 + 玻璃感 FM
    case 'open':
      noiseSweep({ dur: 0.26, from: 500, to: 4200, q: 4, vol: 0.1, verb: 0.25 })
      tone({ freq: 540, dur: 0.22, type: 'triangle', vol: 0.12, slideTo: 1080, fm: { ratio: 2.0, depth: 0.4 }, verb: 0.2 })
      break
    case 'close':
      noiseSweep({ dur: 0.22, from: 3600, to: 500, q: 4, vol: 0.09 })
      tone({ freq: 900, dur: 0.2, type: 'triangle', vol: 0.1, slideTo: 360, verb: 0.15 })
      break
    // 進入時光之門：扭曲俯衝再拉升的「躍遷」
    case 'enter':
      noiseSweep({ dur: 0.6, from: 300, to: 5000, q: 5, vol: 0.16, verb: 0.4 })
      tone({ freq: 180, dur: 0.5, type: 'sawtooth', vol: 0.14, slideTo: 70, verb: 0.3 })
      tone({ freq: 260, dur: 0.6, type: 'sine', vol: 0.14, slideTo: 1400, delay: 0.12, fm: { ratio: 1.5, depth: 0.6 }, verb: 0.4 })
      break
    // 電源啟動：次低頻撞擊 + 上升電流嗡鳴
    case 'power':
      tone({ freq: 80, dur: 0.45, type: 'sine', vol: 0.24, slideTo: 200, verb: 0.2 })
      tone({ freq: 120, dur: 0.5, type: 'sawtooth', vol: 0.08, slideTo: 320, detune: 8, verb: 0.3 })
      noiseSweep({ dur: 0.25, from: 200, to: 1600, q: 3, vol: 0.07 })
      break
    // 過關：閃耀上行琶音 + 鐘聲泛音 + 去諧
    case 'success':
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone({ freq: f, dur: 0.5, type: 'triangle', vol: 0.16, delay: i * 0.08, detune: 5, fm: { ratio: 3.0, depth: 0.25 }, verb: 0.45 }))
      noiseSweep({ dur: 0.5, from: 1200, to: 6000, q: 2, vol: 0.06, delay: 0.1, verb: 0.4 })
      break
    // 取得殘頁：水晶鐘聲（FM 鐘 + 高泛音 + 長殘響）
    case 'fragment':
      tone({ freq: 880, dur: 0.9, type: 'sine', vol: 0.18, fm: { ratio: 3.5, depth: 0.6 }, verb: 0.6 })
      tone({ freq: 1320, dur: 0.7, type: 'sine', vol: 0.08, delay: 0.04, fm: { ratio: 2.0, depth: 0.4 }, verb: 0.6 })
      tone({ freq: 1760, dur: 0.5, type: 'sine', vol: 0.05, delay: 0.08, verb: 0.5 })
      break
    // 答對：明亮雙音確認
    case 'correct':
      [659.25, 987.77].forEach((f, i) =>
        tone({ freq: f, dur: 0.28, type: 'triangle', vol: 0.18, delay: i * 0.09, fm: { ratio: 2.0, depth: 0.3 }, verb: 0.3 }))
      break
    // 答錯：去諧下行嗡鳴 + 噪聲
    case 'wrong':
      tone({ freq: 200, dur: 0.32, type: 'sawtooth', vol: 0.16, slideTo: 90, detune: 14, verb: 0.2 })
      noiseSweep({ dur: 0.28, from: 900, to: 200, q: 8, vol: 0.08 })
      break
    // 失敗：陰暗下行音叢
    case 'fail':
      [349.23, 261.63, 174.61].forEach((f, i) =>
        tone({ freq: f, dur: 0.45, type: 'sawtooth', vol: 0.16, delay: i * 0.13, detune: 10, verb: 0.3 }))
      break
    // 真相揭示：電影級拉升（噪聲漸強 + 上行和弦 + 鐘）
    case 'reveal':
      noiseSweep({ dur: 1.4, from: 200, to: 5200, q: 1.5, vol: 0.1, verb: 0.6 })
      ;[392, 493.88, 587.33, 783.99].forEach((f, i) =>
        tone({ freq: f, dur: 1.6, type: 'triangle', vol: 0.12, delay: i * 0.18, detune: 6, fm: { ratio: 2.0, depth: 0.2 }, verb: 0.6 }))
      tone({ freq: 1567.98, dur: 1.2, type: 'sine', vol: 0.06, delay: 0.7, fm: { ratio: 3.5, depth: 0.5 }, verb: 0.7 })
      break
  }
}

// 程序式環境 drone（極輕、低頻襯底；無 bgm.mp3 時的後備）
function startDrone() {
  if (!ctx || !master || droneGain) return
  droneGain = ctx.createGain()
  droneGain.gain.value = 0.0
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 600
  droneGain.connect(lp).connect(master)
  const freqs = [55, 110, 164.81, 220]
  freqs.forEach((f, i) => {
    const o = ctx!.createOscillator()
    o.type = i === 0 ? 'sine' : 'triangle'
    o.frequency.value = f
    o.detune.value = (i - 1.5) * 4
    const g = ctx!.createGain()
    g.gain.value = i === 0 ? 0.5 : 0.16
    o.connect(g).connect(droneGain!)
    o.start()
    const lfo = ctx!.createOscillator()
    lfo.frequency.value = 0.05 + i * 0.017
    const lfoGain = ctx!.createGain()
    lfoGain.gain.value = g.gain.value * 0.5
    lfo.connect(lfoGain).connect(g.gain)
    lfo.start()
  })
  droneGain.gain.linearRampToValueAtTime(muted ? 0 : 0.09, ctx.currentTime + 4)
}

export function startBgm() {
  if (bgmStarted) return
  bgmStarted = true
  ensure()
  // 以 BASE_URL 解析 bgm.mp3，確保 GitHub Pages 子路徑（/chronoampere/）也能載入
  const url = (import.meta.env.BASE_URL || '/') + 'bgm.mp3'
  const el = new Audio(url)
  el.loop = true
  el.volume = muted ? 0 : 0.42
  bgmEl = el
  el.addEventListener('canplaythrough', () => {
    if (droneGain && ctx) droneGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5) // 有正式配樂就淡出襯底
    if (!muted) el.play().catch(() => startDrone())
  }, { once: true })
  el.addEventListener('error', () => startDrone(), { once: true })
  window.setTimeout(() => { if (bgmEl && bgmEl.paused) startDrone() }, 4000)
}

export function setMuted(m: boolean) {
  muted = m
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05)
  if (bgmEl) bgmEl.volume = m ? 0 : 0.45
}
export function toggleMuted() { setMuted(!muted); return muted }
export function isMuted() { return muted }
