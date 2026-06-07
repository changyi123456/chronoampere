// ============================================================================
// audio.ts — 輕量 WebAudio 音效引擎（程序式音效 + 環境背景音樂）。
// 無需外部音檔即可運作；若 public/bgm.mp3 存在則優先播放它，否則用程序式 drone。
// 須在使用者手勢（開始鍵）後呼叫 unlock() / startBgm()（瀏覽器自動播放限制）。
// ============================================================================
type Ctx = AudioContext

let ctx: Ctx | null = null
let master: GainNode | null = null
let muted = false
let bgmStarted = false
let droneGain: GainNode | null = null
let bgmEl: HTMLAudioElement | null = null

function ensure(): Ctx {
  if (!ctx) {
    const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 1
    master.connect(ctx.destination)
  }
  return ctx
}

export function unlock() {
  const c = ensure()
  if (c.state === 'suspended') c.resume()
}

function blip(opt: { freq: number; dur?: number; type?: OscillatorType; vol?: number; slideTo?: number; delay?: number }) {
  if (muted || !master || !ctx) return
  const { freq, dur = 0.12, type = 'sine', vol = 0.25, slideTo, delay = 0 } = opt
  const t0 = ctx.currentTime + delay
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(master)
  o.start(t0)
  o.stop(t0 + dur + 0.03)
}

export type Sfx = 'click' | 'open' | 'close' | 'enter' | 'power' | 'success' | 'fail' | 'correct' | 'wrong' | 'fragment' | 'reveal'

export function sfx(name: Sfx) {
  if (muted) return
  ensure()
  switch (name) {
    case 'click': blip({ freq: 520, dur: 0.07, type: 'triangle', vol: 0.18 }); break
    case 'open': blip({ freq: 430, dur: 0.13, type: 'sine', vol: 0.2, slideTo: 680 }); break
    case 'close': blip({ freq: 540, dur: 0.12, type: 'sine', vol: 0.18, slideTo: 320 }); break
    case 'enter': blip({ freq: 220, dur: 0.5, type: 'sawtooth', vol: 0.18, slideTo: 740 }); break
    case 'power': blip({ freq: 120, dur: 0.4, type: 'sine', vol: 0.22, slideTo: 340 }); break
    case 'success': [523, 659, 784].forEach((f, i) => blip({ freq: f, dur: 0.18, type: 'triangle', vol: 0.22, delay: i * 0.09 })); break
    case 'fragment': blip({ freq: 880, dur: 0.55, type: 'sine', vol: 0.22 }); blip({ freq: 1320, dur: 0.55, type: 'sine', vol: 0.1 }); break
    case 'correct': [660, 990].forEach((f, i) => blip({ freq: f, dur: 0.16, type: 'triangle', vol: 0.22, delay: i * 0.1 })); break
    case 'wrong': blip({ freq: 170, dur: 0.28, type: 'sawtooth', vol: 0.2, slideTo: 90 }); break
    case 'fail': [330, 247, 165].forEach((f, i) => blip({ freq: f, dur: 0.22, type: 'sawtooth', vol: 0.2, delay: i * 0.12 })); break
    case 'reveal': [392, 494, 587, 784].forEach((f, i) => blip({ freq: f, dur: 0.7, type: 'sine', vol: 0.18, delay: i * 0.2 })); break
  }
}

// 程序式環境 drone（極輕、低頻襯底）
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
    // 緩慢 LFO 調變音量，營造呼吸感
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
  // 優先播放 public/bgm.mp3（Interstellar 主題）；載入失敗才用程序式 drone
  const el = new Audio('/bgm.mp3')
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
