// ============================================================================
// Hud.tsx — 2D overlay：開場、Hub（含 RPG 工具列）、關卡控制台、即時示波器、
// RPG 對話框系統（引導 NPC / 碎片選擇題）、任務日誌彈窗、最終推理。
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store/store'
import { getSolve } from '../game/useSolve'
import { live } from '../game/live'
import {
  CHALLENGES, CHALLENGE_ORDER, FINALE, PROLOGUE,
  type ChallengeId, type ChallengeMeta, type Scene,
} from '../story/script'
import { COLORS } from '../theme'
import * as audio from '../game/audio'

const CH_IDS = CHALLENGE_ORDER
function isChallenge(s: Scene): s is ChallengeId { return (CH_IDS as string[]).includes(s) }

function useIsMobile() {
  const [m, setM] = useState(typeof window !== 'undefined' ? window.innerWidth < 760 : false)
  useEffect(() => { const f = () => setM(window.innerWidth < 760); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [])
  return m
}

interface SliderDef { key: string; label: string; min: number; max: number; step: number; unit: string }
const SLIDERS: Record<ChallengeId, SliderDef[]> = {
  lamp: [],
  split: [],
  cyclo: [],
  maglock: [],
  dynamo: [
    { key: 'dynamo_N', label: '線圈匝數 N', min: 10, max: 200, step: 1, unit: '' },
    { key: 'dynamo_w', label: '轉速 ω', min: 1, max: 30, step: 0.1, unit: 'rad/s' },
  ],
  xfmr: [
    { key: 'xfmr_v1', label: '初級電壓 V1', min: 90, max: 140, step: 1, unit: 'V' },
    { key: 'xfmr_n2', label: '次級匝數 N2', min: 5, max: 120, step: 1, unit: '' },
  ],
}

const GUIDE = {
  speaker: '時光導引體 AMP',
  accent: COLORS.teal,
  lines: [
    '我是 AMP，時光電弧儀的導引體，會一路陪著你。',
    '任務：走進六道時光之門，重現歐姆、克希何夫、湯姆森、布勞恩、法拉第與變壓器時代的實驗。',
    '每重現一項實驗，我會出一道選擇題；答對就能取得那個年代的「殘頁」。',
    '集滿六張殘頁，回到中央光環，我們一起拼出那張神秘紙條的真相。',
    '移動：WASD／方向鍵；靠近門按 E 進入。隨時點我或開啟「任務日誌」。',
  ],
}

export function Hud() {
  const { scene } = useGame()
  return (
    <>
      {scene === 'intro' && <IntroOverlay />}
      {scene === 'finale' && <FinaleOverlay />}
      {scene === 'hub' && <HubOverlay />}
      {isChallenge(scene) && <RoomOverlay id={scene} />}
      <DialogueLayer />
      <JournalLayer />
    </>
  )
}

function IntroOverlay() {
  const { setScene, solvedCount, setDialogue } = useGame()
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(135% 95% at 50% 24%, rgba(3,4,10,0) 32%, rgba(3,4,10,0.6) 100%)' }} />
      <div style={{ position: 'absolute', top: '11%', left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', color: COLORS.teal, fontSize: 16, letterSpacing: 10, textShadow: `0 0 20px ${COLORS.teal}` }}>CHRONOAMPERE</div>
        <h1 style={{ fontFamily: 'var(--font-display)', margin: '14px 0 0', fontSize: 'clamp(42px,7vw,78px)', letterSpacing: 12, color: '#eaf6ff', fontWeight: 900, textShadow: '0 0 30px rgba(94,234,212,0.6), 0 6px 22px rgba(0,0,0,0.65)' }}>電的時光旅人</h1>
        <div style={{ marginTop: 12, color: '#9fb4cc', fontSize: 15, letterSpacing: 4 }}>穿越時空的科學史探險</div>
      </div>
      <div style={{ position: 'absolute', bottom: '11%', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <button style={startBtn} onClick={() => { audio.unlock(); audio.startBgm(); setScene('hub') }}>{solvedCount > 0 ? '繼續旅程 ▶' : '啟動時光電弧儀 ▶'}</button>
        <button style={ghostBtn} onClick={() => { audio.unlock(); setDialogue({ speaker: '時光電弧儀・任務簡報', accent: COLORS.teal, lines: PROLOGUE.lines }) }}>劇情簡介</button>
        <div style={{ marginTop: 6, color: '#7c8aa0', fontSize: 12, letterSpacing: 1 }}>WASD／方向鍵移動 ・ 走近時光之門按 E 進入 ・ 場上的 AMP 會引導你</div>
      </div>
    </div>
  )
}

function HubOverlay() {
  const { solvedCount, allSolved, nearDoor, setScene, resetProgress, setDialogue, setJournalOpen, muted, toggleMuted } = useGame()
  const mobile = useIsMobile()
  return (
    <>
      <div style={{ ...topBar, ...(mobile ? mTop : null), pointerEvents: 'auto' }}>
        <b style={{ color: COLORS.teal, fontFamily: 'var(--font-display)', letterSpacing: 2 }}>CHRONOAMPERE</b>
        <span style={{ color: COLORS.dim, marginLeft: 12 }}>重現實驗進度 {solvedCount} / 6</span>
        <div style={{ flex: 1 }} />
        <ProgressDots />
        <button style={miniBtn} onClick={toggleMuted}>{muted ? '♪ 靜音中' : '♪ 音效開'}</button>
        <button style={miniBtn} onClick={resetProgress}>重置進度</button>
      </div>

      {/* RPG 工具列 */}
      <div style={{ position: 'absolute', bottom: 24, left: 24, display: 'flex', gap: 10, pointerEvents: 'auto' }}>
        <button style={rpgBtn(COLORS.amber)} onClick={() => setJournalOpen(true)}>▤ 任務日誌</button>
        <button style={rpgBtn(COLORS.teal)} onClick={() => setDialogue(GUIDE)}>◇ 呼叫 AMP</button>
      </div>

      {nearDoor && (
        <div style={prompt}>按 <kbd style={kbd}>E</kbd> 進入：{CHALLENGES[nearDoor].title}</div>
      )}
      {allSolved && (
        <div style={{ ...centerBottom, pointerEvents: 'auto' }}>
          <button style={btn(COLORS.rose)} onClick={() => setScene('finale')}>▶ 啟動時光電弧儀・拼出真相</button>
        </div>
      )}
    </>
  )
}

function ProgressDots() {
  const { solved } = useGame()
  return (
    <div style={{ display: 'flex', gap: 6, marginRight: 12 }}>
      {CHALLENGE_ORDER.map((id) => (
        <span key={id} title={CHALLENGES[id].title} style={{
          width: 12, height: 12, borderRadius: 3,
          background: solved[id] ? COLORS.green : 'transparent',
          border: `1px solid ${solved[id] ? COLORS.green : COLORS.dim}`,
        }} />
      ))}
    </div>
  )
}

function RoomOverlay({ id }: { id: ChallengeId }) {
  const { values, patch, setScene, solved, running, setRunning, doReset, muted, toggleMuted } = useGame()
  const meta = CHALLENGES[id]
  const res = getSolve(id, values)
  const done = !!solved[id]
  const mobile = useIsMobile()
  return (
    <>
      <div style={{ ...topBar, ...(mobile ? mTop : null) }}>
        <button style={miniBtn} onClick={() => setScene('hub')}>◀ 返回時光樞紐</button>
        <span style={{ color: COLORS.teal, marginLeft: 14, fontWeight: 700 }}>{meta.system}</span>
        <span style={{ color: COLORS.dim, marginLeft: 10, fontSize: 12 }}>{meta.chapter}</span>
        <div style={{ flex: 1 }} />
        <button style={miniBtn} onClick={toggleMuted}>{muted ? '♪ 靜音中' : '♪ 音效開'}</button>
      </div>

      <div style={{ ...goalBox, ...(mobile ? mGoal : null), pointerEvents: 'auto' }}>
        <div style={{ fontFamily: 'var(--font-display)', color: COLORS.amber, fontSize: 11, letterSpacing: 3, marginBottom: 7 }}>MISSION ・ 實驗目標</div>
        {meta.goalHint.split(/(?=[①②③])/).map((p, i) => (
          <div key={i} style={{ fontSize: 12.5, lineHeight: 1.7, color: i ? COLORS.text : COLORS.dim, marginBottom: 4 }}>{p.trim()}</div>
        ))}
      </div>

      <div style={{ ...scopePanel, ...(mobile ? mScope : null), pointerEvents: 'auto' }}>
        <Scope />
        <Readout />
      </div>

      <div style={{ ...panel, ...(mobile ? mPanel : null), pointerEvents: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button style={{ ...bigBtn, background: running ? COLORS.amber : COLORS.green }} onClick={() => setRunning(!running)}>{running ? '⏸ 暫停' : '▶ 啟動'}</button>
          <button style={{ ...bigBtn, background: COLORS.rose }} onClick={doReset}>↺ 重置</button>
        </div>
        {SLIDERS[id].length === 0 && (
          <div style={{ fontSize: 12, color: COLORS.dim, marginBottom: 8, lineHeight: 1.6 }}>用實驗台上的旋鈕（拖曳粗調・滾輪微調）與滑動變阻器手動操作</div>
        )}
        {SLIDERS[id].map((s) => (
          <div key={s.key} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>{s.label}</span>
              <span style={{ color: COLORS.amber }}>{values[s.key].toFixed(s.step < 1 ? 2 : 0)} {s.unit}</span>
            </div>
            <input type="range" min={s.min} max={s.max} step={s.step} value={values[s.key]}
              onChange={(e) => patch({ [s.key]: +e.target.value })} style={{ width: '100%', accentColor: COLORS.teal }} />
          </div>
        ))}
        <ConditionList conds={res.conds} done={done} />
      </div>

      {done && <FragmentQuiz id={id} meta={meta} />}
    </>
  )
}

// 碎片選擇題：以 AMP 的 RPG 對話框呈現
function FragmentQuiz({ id, meta }: { id: ChallengeId; meta: ChallengeMeta }) {
  const { fragments, setFragment, setScene } = useGame()
  const collected = !!fragments[id]
  const [picked, setPicked] = useState<number | null>(null)
  const q = meta.quiz
  const isCorrect = picked === q.correct

  if (collected) {
    return (
      <DialogueBox speaker="時光導引體 AMP" accent={COLORS.amber} dim
        footer={<button style={btn(COLORS.teal)} onClick={() => setScene('hub')}>返回時光樞紐 ▶</button>}>
        <div style={{ color: COLORS.amber, fontSize: 13, marginBottom: 6 }}>{meta.clueTag}・已收藏</div>
        <div style={{ lineHeight: 1.8 }}>{meta.clue}</div>
      </DialogueBox>
    )
  }
  return (
    <DialogueBox speaker="時光導引體 AMP" accent={COLORS.green} dim>
      <div style={{ color: COLORS.green, fontWeight: 700, marginBottom: 6 }}>實驗重現成功！答對問題就能取得 {meta.clueTag}。</div>
      <div style={{ marginBottom: 10, lineHeight: 1.7 }}>{q.q}</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {q.options.map((o, i) => {
          const chosen = picked === i
          const tone = chosen ? (i === q.correct ? COLORS.green : COLORS.rose) : '#2b3a52'
          return (
            <button key={i} style={{ ...choiceBtn, borderColor: tone }} onClick={() => setPicked(i)}>
              <b style={{ color: COLORS.amber }}>{String.fromCharCode(65 + i)}.</b> {o}
            </button>
          )
        })}
      </div>
      {picked !== null && !isCorrect && <div style={{ marginTop: 12, color: COLORS.rose }}>✗ 再想想……換個選項試試。</div>}
      {isCorrect && (
        <>
          <div style={{ marginTop: 12, color: COLORS.green, lineHeight: 1.7 }}>✓ 正確！{q.explain}</div>
          <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(30,24,10,0.5)', border: `1px solid ${COLORS.amber}`, borderRadius: 10, lineHeight: 1.75 }}>
            <b style={{ color: COLORS.amber }}>{meta.clueTag}</b>　{meta.clue}
          </div>
          <button style={btn(COLORS.teal)} onClick={() => { setFragment(id); setScene('hub') }}>收下殘頁，返回 ▶</button>
        </>
      )}
    </DialogueBox>
  )
}

function ConditionList({ conds, done }: { conds: { label: string; ok: boolean }[]; done: boolean }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, color: COLORS.dim, marginBottom: 4 }}>過關條件（須同時達成）</div>
      {conds.map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, marginBottom: 2, color: c.ok ? COLORS.green : COLORS.text }}>
          <span style={{ width: 14 }}>{c.ok ? '✓' : '○'}</span><span>{c.label}</span>
        </div>
      ))}
      {done && <div style={{ color: COLORS.green, fontWeight: 700, marginTop: 4 }}>全部達成！系統校準完成</div>}
    </div>
  )
}

function Scope() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let raf = 0
    const W = 300, H = 150
    const draw = () => {
      const c = ref.current
      if (c) {
        const ctx = c.getContext('2d')!
        const { config: cfg, samples } = live
        const span = cfg.yMax - cfg.yMin || 1
        const toY = (v: number) => H - ((v - cfg.yMin) / span) * H
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#060a14'; ctx.fillRect(0, 0, W, H)
        ctx.strokeStyle = '#16233b'; ctx.lineWidth = 1
        for (let x = 0; x <= W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
        for (let y = 0; y <= H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
        if (cfg.yMin < 0) { ctx.strokeStyle = '#33415588'; ctx.beginPath(); ctx.moveTo(0, toY(0)); ctx.lineTo(W, toY(0)); ctx.stroke() }
        if (cfg.targetY != null) { ctx.strokeStyle = COLORS.green; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(0, toY(cfg.targetY)); ctx.lineTo(W, toY(cfg.targetY)); ctx.stroke(); ctx.setLineDash([]) }
        const drawTrace = (key: 'a' | 'b', color: string) => {
          if (samples.length < 2) return
          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath()
          samples.forEach((s, i) => { const v = s[key]; if (v == null) return; const x = (i / 239) * W; const y = toY(v); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y) })
          ctx.stroke()
        }
        drawTrace('a', cfg.aColor)
        if (cfg.bLabel) drawTrace('b', cfg.bColor || COLORS.amber)
        ctx.font = '11px system-ui'; ctx.fillStyle = cfg.aColor; ctx.fillText('— ' + cfg.aLabel, 6, 14)
        if (cfg.bLabel) { ctx.fillStyle = cfg.bColor || COLORS.amber; ctx.fillText('— ' + cfg.bLabel, 6, 28) }
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} width={300} height={150} style={{ width: '100%', borderRadius: 8, border: '1px solid #1e2c46', display: 'block' }} />
}

function Readout() {
  const [, force] = useState(0)
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 140); return () => clearInterval(t) }, [])
  const statusColor = live.status === 'fail' ? COLORS.rose : live.status === 'done' ? COLORS.green : COLORS.dim
  const statusText = live.status === 'fail' ? '✗ 模擬失敗，請按 ↺ 重置' : live.status === 'done' ? '✓ 系統校準完成！' : live.status === 'run' ? '● 模擬執行中' : '○ 待機（按 ▶ 啟動）'
  return (
    <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.6 }}>
      <div style={{ color: statusColor, fontWeight: 700, marginBottom: 4 }}>{statusText}</div>
      {live.readout.map((line, i) => (<div key={i} style={{ color: COLORS.text, fontFamily: 'ui-monospace, monospace' }}>{line}</div>))}
    </div>
  )
}

function FinaleOverlay() {
  const { resetProgress } = useGame()
  const [picked, setPicked] = useState<string | null>(null)
  const chosen = FINALE.options.find((o) => o.key === picked)
  const correct = chosen?.correct
  return (
    <Fill>
      <div style={card(660)}>
        <Corners color={COLORS.teal} />
        {!correct ? (
          <>
            <div style={{ color: COLORS.rose, fontSize: 13, letterSpacing: 3 }}>時間迴圈・最終推理</div>
            <details style={{ margin: '10px 0 6px' }}>
              <summary style={{ cursor: 'pointer', color: COLORS.amber, fontSize: 13 }}>殘頁回顧（六張）</summary>
              {CHALLENGE_ORDER.map((cid) => (
                <div key={cid} style={{ fontSize: 12.5, color: COLORS.dim, margin: '6px 0', lineHeight: 1.6 }}>
                  <b style={{ color: COLORS.teal }}>{CHALLENGES[cid].clueTag}</b>　{CHALLENGES[cid].clue}
                </div>
              ))}
            </details>
            <p style={{ color: COLORS.text, fontSize: 16, lineHeight: 1.8, margin: '10px 0 18px' }}>{FINALE.question}</p>
            {FINALE.options.map((o) => (
              <button key={o.key} style={{ ...choiceBtn, margin: '8px 0', borderColor: picked === o.key ? COLORS.rose : '#2b3a52' }} onClick={() => { setPicked(o.key); audio.sfx(o.correct ? 'reveal' : 'wrong') }}>
                <b style={{ color: COLORS.amber }}>{o.key}.</b> {o.text}
              </button>
            ))}
            {chosen && !chosen.correct && <div style={{ marginTop: 14, color: COLORS.rose, lineHeight: 1.7 }}>✗ {chosen.reason}</div>}
          </>
        ) : (
          <>
            <div style={{ color: COLORS.green, fontSize: 13, letterSpacing: 3 }}>真相揭曉</div>
            <h2 style={{ color: COLORS.text, margin: '8px 0 14px' }}>沒有起點的紙條</h2>
            <div style={{ color: COLORS.dim, fontSize: 15, lineHeight: 1.95, whiteSpace: 'pre-wrap' }}>{FINALE.reveal.join('\n')}</div>
            <button style={btn(COLORS.teal)} onClick={resetProgress}>↺ 重新展開旅程</button>
          </>
        )}
      </div>
    </Fill>
  )
}

// ── RPG 引導體頭像 ───────────────────────────────────────────────────────
function GuidePortrait({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 80 80" width="74" height="74" aria-hidden="true">
      <rect x="13" y="20" width="54" height="46" rx="15" fill="#0d1a2c" stroke={accent} strokeWidth="2.5" />
      <line x1="40" y1="9" x2="40" y2="20" stroke={accent} strokeWidth="2.5" />
      <circle cx="40" cy="8" r="3.4" fill={accent} />
      <circle cx="30" cy="40" r="7" fill={accent} />
      <circle cx="50" cy="40" r="7" fill={accent} />
      <circle cx="30" cy="40" r="3" fill="#06101c" />
      <circle cx="50" cy="40" r="3" fill="#06101c" />
      <rect x="31" y="53" width="18" height="4" rx="2" fill={accent} opacity="0.65" />
    </svg>
  )
}

// ── RPG 對話框（底部，含頭像 + 名牌 + 內容） ─────────────────────────────
function DialogueBox({ speaker, accent = COLORS.teal, dim = false, children, footer }: {
  speaker: string; accent?: string; dim?: boolean; children: React.ReactNode; footer?: React.ReactNode
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 90000000, pointerEvents: dim ? 'auto' : 'none', background: dim ? 'rgba(4,6,12,0.58)' : 'transparent', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 26px' }}>
      <div style={{ pointerEvents: 'auto', width: 'min(94vw, 880px)', position: 'relative', background: 'rgba(10,16,30,0.5)', border: `2px solid ${accent}`, borderRadius: 16, padding: '16px 20px 16px 18px', backdropFilter: 'blur(18px) saturate(150%)', WebkitBackdropFilter: 'blur(18px) saturate(150%)', boxShadow: `0 0 34px ${accent}40, 0 22px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.14)`, display: 'flex', gap: 16 }}>
        <Corners color={accent} />
        {/* 名牌 */}
        <div style={{ position: 'absolute', top: -14, left: 22, padding: '3px 14px', background: accent, color: '#06121f', borderRadius: 999, fontSize: 13, fontWeight: 800 }}>{speaker}</div>
        {/* 頭像 */}
        <div style={{ flex: '0 0 auto', width: 84, height: 84, borderRadius: 14, border: `1.5px solid ${accent}`, background: 'rgba(13,26,44,0.8)', display: 'grid', placeItems: 'center', alignSelf: 'center' }}>
          <GuidePortrait accent={accent} />
        </div>
        {/* 內容 */}
        <div style={{ flex: 1, color: COLORS.text, font: "14px/1.7 system-ui,'Microsoft JhengHei',sans-serif", paddingTop: 6 }}>
          {children}
          {footer && <div style={{ marginTop: 12, textAlign: 'right' }}>{footer}</div>}
        </div>
      </div>
    </div>
  )
}

function DialogueLayer() {
  const { dialogue, setDialogue } = useGame()
  if (!dialogue) return null
  return (
    <DialogueBox speaker={dialogue.speaker} accent={dialogue.accent || COLORS.teal}
      footer={<button style={btn(dialogue.accent || COLORS.teal)} onClick={() => setDialogue(null)}>了解！▶</button>}>
      {dialogue.lines.map((l, i) => (<p key={i} style={{ margin: '0 0 8px' }}>{l}</p>))}
    </DialogueBox>
  )
}

// ── 任務日誌彈窗 ─────────────────────────────────────────────────────────
function JournalLayer() {
  const { journalOpen, setJournalOpen, solved, fragments } = useGame()
  if (!journalOpen) return null
  return (
    <Fill>
      <div style={{ ...card(620), border: `2px solid ${COLORS.amber}` }}>
        <Corners color={COLORS.amber} />
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <h2 style={{ margin: 0, color: COLORS.text }}>任務日誌</h2>
          <div style={{ flex: 1 }} />
          <button style={miniBtn} onClick={() => setJournalOpen(false)}>✕ 關閉</button>
        </div>
        <div style={{ color: COLORS.dim, fontSize: 13, lineHeight: 1.7, marginBottom: 14, padding: '10px 12px', background: 'rgba(20,16,8,0.5)', border: `1px solid ${COLORS.amber}55`, borderRadius: 10 }}>
          <b style={{ color: COLORS.amber }}>主線謎題</b>　六個年代、六位互不相識的科學家，筆記裡都夾著同一張字跡相同的紙條，每人都說「它一直都在」。它從何而來？
        </div>
        {CHALLENGE_ORDER.map((cid, i) => {
          const m = CHALLENGES[cid]
          const sv = !!solved[cid]; const fr = !!fragments[cid]
          return (
            <div key={cid} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: i ? '1px solid #1c2740' : 'none' }}>
              <div style={{ flex: '0 0 auto', width: 26, height: 26, borderRadius: 8, background: fr ? COLORS.green : sv ? COLORS.amber : 'transparent', border: `1px solid ${fr ? COLORS.green : sv ? COLORS.amber : COLORS.dim}`, color: '#06121f', fontWeight: 800, display: 'grid', placeItems: 'center', fontSize: 13 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: COLORS.text, fontSize: 14, fontWeight: 600 }}>{m.title}</div>
                <div style={{ color: COLORS.dim, fontSize: 12, marginTop: 2 }}>{m.chapter}</div>
                <div style={{ fontSize: 12.5, marginTop: 4, color: fr ? COLORS.text : COLORS.dim }}>
                  {fr ? <><b style={{ color: COLORS.teal }}>{m.clueTag}</b>　{m.clue}</> : sv ? '已重現實驗，尚未取得殘頁（回去答題）' : '尚未重現'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Fill>
  )
}

// ── 樣式 ────────────────────────────────────────────────────────────────
function Fill({ children, dim = true }: { children: React.ReactNode; dim?: boolean }) {
  return <div style={{ position: 'absolute', inset: 0, zIndex: 90000000, display: 'grid', placeItems: 'center', background: dim ? 'rgba(4,6,12,0.82)' : 'radial-gradient(120% 120% at 50% 38%, rgba(4,6,12,0.12) 0%, rgba(4,6,12,0.82) 100%)', pointerEvents: 'auto', padding: 20 }}>{children}</div>
}

function Corners({ color }: { color: string }) {
  const b: React.CSSProperties = { position: 'absolute', width: 16, height: 16, borderColor: color, borderStyle: 'solid', pointerEvents: 'none' }
  return (
    <>
      <span style={{ ...b, top: -2, left: -2, borderWidth: '2px 0 0 2px', borderTopLeftRadius: 6 }} />
      <span style={{ ...b, top: -2, right: -2, borderWidth: '2px 2px 0 0', borderTopRightRadius: 6 }} />
      <span style={{ ...b, bottom: -2, left: -2, borderWidth: '0 0 2px 2px', borderBottomLeftRadius: 6 }} />
      <span style={{ ...b, bottom: -2, right: -2, borderWidth: '0 2px 2px 0', borderBottomRightRadius: 6 }} />
    </>
  )
}
function card(w: number): React.CSSProperties {
  return { position: 'relative', width: 'min(92vw,' + w + 'px)', maxHeight: '88vh', overflowY: 'auto', background: 'rgba(12,18,34,0.5)', backdropFilter: 'blur(18px) saturate(150%)', WebkitBackdropFilter: 'blur(18px) saturate(150%)', border: `1.5px solid rgba(94,234,212,0.5)`, borderRadius: 18, padding: '30px 34px', boxShadow: `0 26px 70px rgba(0,0,0,0.6), 0 0 30px ${COLORS.teal}25, inset 0 1px 0 rgba(255,255,255,0.12)` }
}
function btn(color: string): React.CSSProperties {
  return { marginTop: 16, padding: '10px 20px', background: color, color: '#06121f', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }
}
function rpgBtn(color: string): React.CSSProperties {
  return { padding: '9px 16px', background: 'rgba(8,13,24,0.9)', color: COLORS.text, border: `1.5px solid ${color}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: `0 0 12px ${color}33` }
}
const bigBtn: React.CSSProperties = { flex: 1, padding: '9px 0', color: '#06121f', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 14, cursor: 'pointer' }
const miniBtn: React.CSSProperties = { padding: '5px 12px', background: 'transparent', color: COLORS.text, border: `1px solid ${COLORS.dim}`, borderRadius: 8, fontSize: 12, cursor: 'pointer' }
const choiceBtn: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', padding: '11px 14px', background: 'rgba(13,24,48,0.7)', color: COLORS.text, border: '1px solid #2b3a52', borderRadius: 10, fontSize: 14, lineHeight: 1.6, cursor: 'pointer' }
const topBar: React.CSSProperties = { position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '12px 18px', background: 'linear-gradient(180deg, rgba(7,11,24,0.92), rgba(7,11,24,0))', pointerEvents: 'auto', font: "13px/1.4 system-ui, 'Microsoft JhengHei', sans-serif", color: COLORS.text }
const goalBox: React.CSSProperties = { position: 'absolute', top: 56, left: 18, maxWidth: 340, padding: '12px 16px', background: 'rgba(10,16,30,0.5)', backdropFilter: 'blur(14px) saturate(140%)', WebkitBackdropFilter: 'blur(14px) saturate(140%)', border: `1px solid rgba(94,234,212,0.45)`, borderRadius: 14, color: COLORS.text, font: "13px/1.7 var(--font-body)" }
const scopePanel: React.CSSProperties = { position: 'absolute', bottom: 24, left: 18, width: 320, padding: '12px 14px', background: 'rgba(10,16,30,0.5)', border: `1px solid rgba(56,189,248,0.5)`, borderRadius: 14, color: COLORS.text, font: "13px var(--font-body)", backdropFilter: 'blur(14px) saturate(140%)', WebkitBackdropFilter: 'blur(14px) saturate(140%)' }
const panel: React.CSSProperties = { position: 'absolute', bottom: 24, right: 24, width: 290, padding: '16px 18px', background: 'rgba(10,16,30,0.5)', border: `1px solid rgba(94,234,212,0.45)`, borderRadius: 14, color: COLORS.text, font: "13px/1.5 var(--font-body)", backdropFilter: 'blur(14px) saturate(140%)', WebkitBackdropFilter: 'blur(14px) saturate(140%)' }
const prompt: React.CSSProperties = { position: 'absolute', bottom: 92, left: '50%', transform: 'translateX(-50%)', padding: '8px 18px', background: 'rgba(7,11,24,0.92)', border: `1px solid ${COLORS.amber}`, borderRadius: 10, color: COLORS.text, font: "14px/1.4 system-ui, 'Microsoft JhengHei', sans-serif" }
const centerBottom: React.CSSProperties = { position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)' }
const kbd: React.CSSProperties = { background: '#1e293b', border: '1px solid #475569', borderRadius: 5, padding: '1px 7px', margin: '0 3px', fontFamily: 'monospace' }
const mTop: React.CSSProperties = { fontSize: 11, flexWrap: 'wrap', gap: 6, padding: '8px 10px' }
const mGoal: React.CSSProperties = { top: 48, left: 6, right: 6, maxWidth: 'none', width: 'auto', maxHeight: '22vh', overflowY: 'auto', padding: '8px 10px' }
const mScope: React.CSSProperties = { left: 6, bottom: 8, width: '46vw', padding: '8px 8px' }
const mPanel: React.CSSProperties = { right: 6, left: 'auto', bottom: 8, width: '46vw', padding: '10px 10px' }
const startBtn: React.CSSProperties = { pointerEvents: 'auto', fontFamily: 'var(--font-display)', padding: '14px 40px', fontSize: 18, fontWeight: 700, letterSpacing: 4, color: '#04121f', background: 'linear-gradient(180deg,#7ff0dc,#36c9ae)', border: 'none', borderRadius: 12, cursor: 'pointer', boxShadow: '0 0 28px rgba(94,234,212,0.6), 0 10px 30px rgba(0,0,0,0.5)' }
const ghostBtn: React.CSSProperties = { pointerEvents: 'auto', padding: '8px 22px', fontSize: 13, letterSpacing: 2, color: '#cfe8ff', background: 'rgba(10,16,30,0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(94,234,212,0.4)', borderRadius: 10, cursor: 'pointer' }
