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
  SOUP_QUESTIONS, QUESTION_BUDGET,
  type ChallengeId, type ChallengeMeta, type Scene,
} from '../story/script'
import { COLORS, ERAS } from '../theme'
import { EM, emEstimate } from '../game/physics'
import * as audio from '../game/audio'
import { setTouchMove, isCoarsePointer } from '../game/touch'
import { ACTS, ENDINGS, EPISODES, HYPOTHESES } from '../story/narrative'

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
    '六個年代分別保存時光電弧儀的調節、分流、導航、顯示、感應與耦合原理。',
    '每關先鎖定一項假說，再用實驗驗證；完成後，你必須決定要在歷史裡留下什麼。',
    '殘頁會釘上證據牆。除了向我提問，你也能提交完整假說，讓證據支持或推翻它。',
    '導師留下三段互相矛盾的紀錄。每修復兩個模組，就能還原下一段。',
    '移動：WASD／方向鍵；靠近門按 E 進入。隨時點我、開「任務日誌」或「證據牆」。',
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
      <EvidenceLayer />
    </>
  )
}

// ── 進關年代字卡（電影感：淡入 → 停留 → 淡出） ───────────────────────────
function EraCard({ id }: { id: ChallengeId }) {
  const era = ERAS[id]
  return (
    <div key={id} style={{ position: 'absolute', top: '16%', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none', zIndex: 40 }}>
      <div className="era-card">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(40px,6vw,64px)', fontWeight: 900, letterSpacing: 14, color: '#f3ead8', textShadow: '0 0 26px rgba(255,200,120,0.45), 0 4px 18px rgba(0,0,0,0.7)' }}>{era.year}</div>
        <div style={{ marginTop: 8, fontSize: 15, letterSpacing: 5, color: '#cdbfa4', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{era.place}</div>
      </div>
    </div>
  )
}

function IntroOverlay() {
  const { setScene, solvedCount, setDialogue } = useGame()
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(135% 95% at 50% 24%, rgba(3,4,10,0) 32%, rgba(3,4,10,0.6) 100%)' }} />
      <div style={{ position: 'absolute', top: '11%', left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', color: COLORS.teal, fontSize: 16, letterSpacing: 10, textShadow: `0 0 20px ${COLORS.teal}` }}>CHRONOAMPERE</div>
        <h1 className="intro-title" style={{ fontFamily: 'var(--font-display)', margin: '14px 0 0', fontSize: 'clamp(42px,7vw,78px)', letterSpacing: 12, color: '#eaf6ff', fontWeight: 900, textShadow: '0 0 30px rgba(94,234,212,0.6), 0 6px 22px rgba(0,0,0,0.65)' }}>電的時光旅人</h1>
        <div style={{ marginTop: 12, color: '#9fb4cc', fontSize: 15, letterSpacing: 4 }}>穿越時空的科學史探險</div>
      </div>
      <div style={{ position: 'absolute', bottom: '11%', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <button style={startBtn} onClick={() => { audio.unlock(); audio.startBgm(); setScene('hub') }}>{solvedCount > 0 ? '繼續旅程 ▶' : '啟動時光電弧儀 ▶'}</button>
        <button style={ghostBtn} onClick={() => { audio.unlock(); setDialogue({ speaker: '時光電弧儀・任務簡報', accent: COLORS.teal, lines: PROLOGUE.lines }) }}>劇情簡介</button>
        <div className="intro-help" style={{ marginTop: 6, color: '#7c8aa0', fontSize: 12, letterSpacing: 1 }}>WASD／方向鍵移動 ・ 走近時光之門按 E 進入 ・ 場上的 AMP 會引導你</div>
      </div>
    </div>
  )
}

function HubOverlay() {
  const { solvedCount, fragmentCount, notesCount, leftNotes, storyReady, currentAct, nearDoor, setScene, resetProgress, setDialogue, setJournalOpen, setEvidenceOpen, muted, toggleMuted } = useGame()
  const mobile = useIsMobile()
  const coarse = isCoarsePointer()
  return (
    <>
      <div style={{ ...topBar, ...(mobile ? mTop : null), pointerEvents: 'auto' }}>
        <b style={{ color: COLORS.teal, fontFamily: 'var(--font-display)', letterSpacing: 2 }}>CHRONOAMPERE</b>
        <span style={{ color: COLORS.dim, marginLeft: 12 }}>{currentAct.title} · 實驗 {solvedCount}/6 · 殘頁 {fragmentCount}/6</span>
        <div style={{ flex: 1 }} />
        <ProgressDots />
        <button style={miniBtn} onClick={toggleMuted}>{muted ? '♪ 靜音中' : '♪ 音效開'}</button>
        <button style={miniBtn} onClick={resetProgress}>重置進度</button>
      </div>

      <div className="act-brief" style={{ pointerEvents: 'none' }}>
        <div className="act-kicker">{currentAct.subtitle}</div>
        <div className="act-question">{currentAct.question}</div>
        <div className="act-directive">{currentAct.directive}</div>
        <div className="module-rail">
          {CHALLENGE_ORDER.map((id) => {
            const episode = EPISODES[id]
            const active = !!leftNotes[id]
            return <span key={id} className={active ? 'module-chip is-online' : 'module-chip'} style={{ '--module-color': CHALLENGES[id].doorColor } as React.CSSProperties}>{active ? '◆' : '◇'} {episode.moduleName}</span>
          })}
        </div>
        <div className="loop-status">因果閉合進度 {notesCount}/6</div>
      </div>

      {/* RPG 工具列（觸控時移到右下，避開左下虛擬搖桿） */}
      <div style={{ position: 'absolute', bottom: 24, ...(coarse ? { right: 24 } : { left: 24 }), display: 'flex', flexDirection: coarse ? 'column' : 'row', gap: 10, pointerEvents: 'auto' }}>
        <button style={rpgBtn(COLORS.amber)} onClick={() => setJournalOpen(true)}>▤ 任務日誌</button>
        <button style={rpgBtn(COLORS.rose)} onClick={() => setEvidenceOpen(true)}>◈ 證據牆・提問</button>
        <button style={rpgBtn(COLORS.teal)} onClick={() => setDialogue(GUIDE)}>◇ 呼叫 AMP</button>
      </div>

      {/* 手機/平板：虛擬搖桿移動主角 */}
      {coarse && <TouchJoystick />}

      {nearDoor && (
        <div style={prompt}>
          {coarse ? <>點一下 <b style={{ color: COLORS.amber }}>{CHALLENGES[nearDoor].title}</b> 之門進入</> : <>按 <kbd style={kbd}>E</kbd> 進入：{CHALLENGES[nearDoor].title}</>}
        </div>
      )}
      {storyReady && (
        <div style={{ ...centerBottom, pointerEvents: 'auto' }}>
          <button style={btn(COLORS.rose)} onClick={() => setScene('finale')}>▶ 六模組同步・進入最終推理</button>
        </div>
      )}
    </>
  )
}

function ProgressDots() {
  const { solved, fragments, leftNotes } = useGame()
  return (
    <div style={{ display: 'flex', gap: 6, marginRight: 12 }}>
      {CHALLENGE_ORDER.map((id) => (
        <span key={id} title={CHALLENGES[id].title} style={{
          width: 12, height: 12, borderRadius: 3,
          background: fragments[id] ? COLORS.amber : leftNotes[id] ? COLORS.teal : solved[id] ? COLORS.green : 'transparent',
          border: `1px solid ${fragments[id] ? COLORS.amber : leftNotes[id] ? COLORS.teal : solved[id] ? COLORS.green : COLORS.dim}`,
        }} />
      ))}
    </div>
  )
}

function RoomOverlay({ id }: { id: ChallengeId }) {
  const { values, patch, setScene, solved, fragments, predictions, running, setRunning, doReset, muted, toggleMuted, emLog } = useGame()
  const meta = CHALLENGES[id]
  const episode = EPISODES[id]
  const res = getSolve(id, values, emLog)
  const done = !!solved[id]
  const mobile = useIsMobile()
  return (
    <>
      <EraCard id={id} />
      <div style={{ ...topBar, ...(mobile ? mTop : null) }}>
        <button style={miniBtn} onClick={() => setScene('hub')}>◀ 返回時光樞紐</button>
        <span style={{ color: COLORS.teal, marginLeft: 14, fontWeight: 700 }}>{meta.system}</span>
        <span style={{ color: COLORS.dim, marginLeft: 10, fontSize: 12 }}>{episode.moduleName}・{meta.chapter}</span>
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
          <button disabled={predictions[id] === undefined && !fragments[id]} style={{ ...bigBtn, opacity: predictions[id] === undefined && !fragments[id] ? 0.45 : 1, background: running ? COLORS.amber : COLORS.green }} onClick={() => setRunning(!running)}>{running ? '⏸ 暫停' : '▶ 啟動'}</button>
          <button style={{ ...bigBtn, background: COLORS.rose }} onClick={doReset}>↺ 重置</button>
        </div>
        {SLIDERS[id].length === 0 && (
          <div style={{ fontSize: 12, color: COLORS.dim, marginBottom: 8, lineHeight: 1.6 }}>用實驗台上的旋鈕（拖曳粗調・滾輪微調）與滑動變阻器手動操作</div>
        )}
        {id === 'cyclo' && <EmRecorder />}
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
      {predictions[id] === undefined && !fragments[id] && <FieldProtocol id={id} />}
    </>
  )
}

function FieldProtocol({ id }: { id: ChallengeId }) {
  const { recordPrediction } = useGame()
  const episode = EPISODES[id]
  const act = ACTS[episode.act - 1]
  return (
    <Fill>
      <div className="protocol-card">
        <div className="protocol-act">{act.title} ／ FIELD PROTOCOL</div>
        <h2>{CHALLENGES[id].title}</h2>
        <div className="module-purpose"><b>{episode.moduleName}</b><span>{episode.moduleFunction}</span></div>
        <div className="arrival-copy">{episode.arrival.map((line) => <p key={line}>{line}</p>)}</div>
        <div className="mentor-log">
          <div className="mentor-log-label">◈ {episode.mentorLog.title}</div>
          {episode.mentorLog.lines.map((line) => <p key={line}>{line}</p>)}
        </div>
        <div className="prediction-title">先鎖定你的實驗假說</div>
        <div className="prediction-question">{episode.prediction.question}</div>
        <div className="prediction-grid">
          {episode.prediction.options.map((option, index) => (
            <button key={option} className="prediction-option" onClick={() => recordPrediction(id, index)}>
              <span>{String.fromCharCode(65 + index)}</span>{option}
            </button>
          ))}
        </div>
        <div className="protocol-note">選擇會被鎖定；實驗完成後才會揭示推論是否成立。</div>
      </div>
    </Fill>
  )
}

// ── e/m 探究數據記錄（COV：改變 V、I，多組取樣求平均）──────────────────
function EmRecorder() {
  const { emLog, recordEm, clearEmLog, running } = useGame()
  const est = emEstimate(emLog)
  return (
    <div style={{ marginBottom: 10, padding: '8px 10px', background: 'rgba(8,20,28,0.55)', border: '1px solid #26a0c055', borderRadius: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <button style={{ ...bigBtn, background: running ? '#26a0c0' : '#33414f', cursor: running ? 'pointer' : 'not-allowed' }}
          disabled={!running} onClick={recordEm}>📋 記錄一組數據</button>
        <button style={miniBtn} onClick={clearEmLog}>清除</button>
      </div>
      <div style={{ fontSize: 11.5, color: COLORS.dim, lineHeight: 1.5, marginBottom: 4 }}>
        改變 V 或 I（控制變因），啟動後記錄 ≥{EM.samplesNeeded} 組讀值（含 ±2% 不確定度），求 e/m 平均。
      </div>
      {emLog.slice(-4).map((s, i) => (
        <div key={i} style={{ fontSize: 11.5, fontFamily: 'ui-monospace, monospace', color: COLORS.text }}>
          #{emLog.length - Math.min(emLog.length, 4) + i + 1} · V={s.V.toFixed(0)}V · I={s.I.toFixed(2)}A · r={(s.r * 100).toFixed(2)}cm · e/m={s.est.toExponential(2)}
        </div>
      ))}
      {est !== null && (
        <div style={{ fontSize: 12, marginTop: 4, color: '#5eead4', fontWeight: 700 }}>
          平均 e/m = {est.toExponential(3)} C/kg（理論 1.759×10¹¹，n={emLog.length}）
        </div>
      )}
    </div>
  )
}

// 碎片選擇題：以 AMP 的 RPG 對話框呈現
function FragmentQuiz({ id, meta }: { id: ChallengeId; meta: ChallengeMeta }) {
  const { fragments, leftNotes, predictions, leaveNote, setFragment, setScene } = useGame()
  const episode = EPISODES[id]
  const collected = !!fragments[id]
  const noteLeft = !!leftNotes[id]
  const [picked, setPicked] = useState<number | null>(null)
  const q = meta.quiz
  const isCorrect = picked === q.correct
  const predicted = predictions[id]
  const predictionCorrect = predicted === episode.prediction.correct

  if (collected) {
    return (
      <DialogueBox speaker="時光導引體 AMP" accent={COLORS.amber} dim
        footer={<button style={btn(COLORS.teal)} onClick={() => setScene('hub')}>返回時光樞紐 ▶</button>}>
        <div style={{ color: COLORS.amber, fontSize: 13, marginBottom: 6 }}>{episode.moduleName} ONLINE・{meta.clueTag} 已收藏</div>
        <div style={{ lineHeight: 1.8 }}>{episode.evidence.body}</div>
      </DialogueBox>
    )
  }
  return (
    <DialogueBox speaker="時光導引體 AMP" accent={COLORS.green} dim>
      <div style={{ color: COLORS.green, fontWeight: 700, marginBottom: 6 }}>實驗重現成功・{episode.moduleName} 校準完成</div>
      <div className={predictionCorrect ? 'prediction-result is-correct' : 'prediction-result'}>
        <b>{predictionCorrect ? '原始假說成立' : '原始假說需要修正'}</b>
        <span>{episode.prediction.explain}</span>
      </div>
      <div style={{ margin: '10px 0', padding: '10px 12px', borderLeft: `3px solid ${COLORS.teal}`, background: 'rgba(8,22,30,0.52)', lineHeight: 1.7 }}>
        <b style={{ color: COLORS.teal }}>{episode.observation.title}</b><br />{episode.observation.body}
      </div>
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
          {!noteLeft ? (
            <div className="note-closure">
              <div className="note-closure-label">CAUSAL ACTION・你必須親手完成歷史紀錄</div>
              <p>{episode.noteAction.prompt}</p>
              <blockquote>{episode.noteAction.inscription}</blockquote>
              <button style={btn(COLORS.amber)} onClick={() => leaveNote(id)}>執筆並把紙條留在桌上</button>
            </div>
          ) : (
            <>
              <div className="note-consequence">{episode.noteAction.consequence}</div>
              <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(45,32,12,0.74)', border: `1px solid ${COLORS.amber}`, borderRadius: 10, lineHeight: 1.75 }}>
                <b style={{ color: COLORS.amber }}>{episode.evidence.title}</b> · {episode.evidence.body}
              </div>
              <button style={btn(COLORS.teal)} onClick={() => { setFragment(id); setScene('hub') }}>封存證據・啟動 {episode.moduleName} ▶</button>
            </>
          )}
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
  const { resetProgress, finaleWrong, bumpFinaleWrong, askedIds, testedHypotheses, endingChoice, chooseEnding } = useGame()
  const [picked, setPicked] = useState<string | null>(null)
  const chosen = FINALE.options.find((o) => o.key === picked)
  const correct = chosen?.correct
  const askedQs = SOUP_QUESTIONS.filter((q) => askedIds.includes(q.id))
  const ending = endingChoice ? ENDINGS[endingChoice] : null
  return (
    <Fill>
      <div className="finale-card" style={card(720)}>
        <Corners color={ending?.color ?? COLORS.teal} />
        {ending ? (
          <>
            <div style={{ color: ending.color, fontSize: 13, letterSpacing: 3 }}>ENDING・{ending.principle}</div>
            <h2 style={{ color: COLORS.text, margin: '8px 0 14px' }}>{ending.title}</h2>
            <div className="ending-epilogue">{ending.epilogue.map((line) => <p key={line}>{line}</p>)}</div>
            <div className="ending-seal" style={{ borderColor: ending.color, color: ending.color }}>CHRONOAMPERE ／ {ending.title}</div>
            <button style={btn(COLORS.teal)} onClick={resetProgress}>↺ 從另一個選擇重新展開旅程</button>
          </>
        ) : !correct ? (
          <>
            <div style={{ color: COLORS.rose, fontSize: 13, letterSpacing: 3 }}>時間迴圈・最終推理</div>
            <details style={{ margin: '10px 0 6px' }}>
              <summary style={{ cursor: 'pointer', color: COLORS.amber, fontSize: 13 }}>殘頁回顧（六張）</summary>
              {CHALLENGE_ORDER.map((cid) => (
                <div key={cid} style={{ fontSize: 12.5, color: COLORS.dim, margin: '6px 0', lineHeight: 1.6 }}>
                  <b style={{ color: COLORS.teal }}>{EPISODES[cid].evidence.title}</b> · {EPISODES[cid].evidence.body}
                </div>
              ))}
            </details>
            {testedHypotheses.length > 0 && <div className="final-hypotheses">已檢定假說 {testedHypotheses.length}/{HYPOTHESES.length}</div>}
            {askedQs.length > 0 && (
              <details style={{ margin: '6px 0' }}>
                <summary style={{ cursor: 'pointer', color: COLORS.teal, fontSize: 13 }}>問答回顧（{askedQs.length} 則）</summary>
                {askedQs.map((q) => (
                  <div key={q.id} style={{ fontSize: 12.5, color: COLORS.dim, margin: '6px 0', lineHeight: 1.6 }}>
                    {q.text} · <b style={{ color: q.answer === 'yes' ? COLORS.green : q.answer === 'no' ? COLORS.rose : COLORS.dim }}>
                      {q.answer === 'yes' ? '是' : q.answer === 'no' ? '否' : '與真相無關'}</b>
                  </div>
                ))}
              </details>
            )}
            <p style={{ color: COLORS.text, fontSize: 16, lineHeight: 1.8, margin: '10px 0 18px' }}>{FINALE.question}</p>
            {FINALE.options.map((o) => (
              <button key={o.key} style={{ ...choiceBtn, margin: '8px 0', borderColor: picked === o.key ? COLORS.rose : '#2b3a52' }}
                onClick={() => { setPicked(o.key); audio.sfx(o.correct ? 'reveal' : 'wrong'); if (!o.correct) bumpFinaleWrong() }}>
                <b style={{ color: COLORS.amber }}>{o.key}.</b> {o.text}
              </button>
            ))}
            {chosen && !chosen.correct && <div style={{ marginTop: 14, color: COLORS.rose, lineHeight: 1.7 }}>✗ {chosen.reason}</div>}
            {finaleWrong >= 2 && !correct && (
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, border: `1px solid ${COLORS.rose}`, background: 'rgba(40,8,16,0.5)', color: '#f3c6cf', fontSize: 13.5, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
                {FINALE.badEnding.join('\n')}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ color: COLORS.green, fontSize: 13, letterSpacing: 3 }}>真相成立・最後授權</div>
            <h2 style={{ color: COLORS.text, margin: '8px 0 14px' }}>沒有起點的紙條</h2>
            <div style={{ color: COLORS.dim, fontSize: 15, lineHeight: 1.95, whiteSpace: 'pre-wrap' }}>{FINALE.reveal.join('\n')}</div>
            <div className="ending-grid">
              {Object.values(ENDINGS).map((option) => (
                <button key={option.id} className="ending-choice" style={{ '--ending-color': option.color } as React.CSSProperties} onClick={() => chooseEnding(option.id)}>
                  <span>{option.principle}</span>
                  <b>{option.title}</b>
                  <p>{option.choice}</p>
                </button>
              ))}
            </div>
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
  const { journalOpen, setJournalOpen, solved, fragments, leftNotes, fragmentCount, currentAct } = useGame()
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
        <div className="journal-act">
          <b>{currentAct.title}・{currentAct.subtitle}</b>
          <span>{currentAct.question}</span>
          <small>{currentAct.directive}</small>
        </div>
        <div className="transmission-stack">
          {ACTS.filter((act) => act.unlockAt <= fragmentCount).map((act) => (
            <details key={act.id} open={act.id === currentAct.id}>
              <summary>導師加密紀錄 0{act.id}</summary>
              {act.transmission.map((line) => <p key={line}>{line}</p>)}
            </details>
          ))}
        </div>
        {CHALLENGE_ORDER.map((cid, i) => {
          const m = CHALLENGES[cid]
          const episode = EPISODES[cid]
          const sv = !!solved[cid]; const fr = !!fragments[cid]
          return (
            <div key={cid} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: i ? '1px solid #1c2740' : 'none' }}>
              <div style={{ flex: '0 0 auto', width: 26, height: 26, borderRadius: 8, background: fr ? COLORS.green : sv ? COLORS.amber : 'transparent', border: `1px solid ${fr ? COLORS.green : sv ? COLORS.amber : COLORS.dim}`, color: '#06121f', fontWeight: 800, display: 'grid', placeItems: 'center', fontSize: 13 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: COLORS.text, fontSize: 14, fontWeight: 600 }}>{m.title}</div>
                <div style={{ color: COLORS.dim, fontSize: 12, marginTop: 2 }}>{episode.moduleName}・{episode.moduleFunction}</div>
                <div style={{ fontSize: 12.5, marginTop: 4, color: fr ? COLORS.text : COLORS.dim }}>
                  {fr ? <><b style={{ color: COLORS.teal }}>{m.clueTag}</b> · {episode.evidence.title}</> : leftNotes[cid] ? '已留下紙條，等待封存證據' : sv ? '實驗完成，尚未閉合本年代的因果紀錄' : '尚未重現'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Fill>
  )
}

// ── 證據牆＋海龜湯提問（玩家主動提問，AMP 只答 是/否/與真相無關） ─────────
function EvidenceLayer() {
  const { evidenceOpen, setEvidenceOpen, fragments, askedIds, testedHypotheses, askQuestion, testHypothesis } = useGame()
  if (!evidenceOpen) return null
  const fragCount = CHALLENGE_ORDER.filter((id) => fragments[id]).length
  const left = QUESTION_BUDGET - askedIds.length
  const ansChip = (a: 'yes' | 'no' | 'irrelevant') =>
    a === 'yes' ? { t: '是', c: COLORS.green } : a === 'no' ? { t: '否', c: COLORS.rose } : { t: '與真相無關', c: COLORS.dim }
  return (
    <Fill>
      <div className="evidence-board" style={{ ...card(760), border: `2px solid ${COLORS.rose}` }}>
        <Corners color={COLORS.rose} />
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ margin: 0, color: COLORS.text }}>證據牆</h2>
          <span style={{ marginLeft: 12, fontSize: 12.5, color: COLORS.dim }}>殘頁 {fragCount}/6 ・ 剩餘提問 <b style={{ color: left > 2 ? COLORS.teal : COLORS.rose }}>{left}</b>/{QUESTION_BUDGET}</span>
          <div style={{ flex: 1 }} />
          <button style={miniBtn} onClick={() => setEvidenceOpen(false)}>✕ 關閉</button>
        </div>
        <div style={{ color: COLORS.dim, fontSize: 12.5, lineHeight: 1.7, marginBottom: 12 }}>
          對 AMP 提問取得單一事實，再把多張殘頁組成可被支持或推翻的假說。真正的進展不是收集答案，而是排除無法同時解釋所有證據的模型。
        </div>

        {/* 已釘上的殘頁 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 8, marginBottom: 14 }}>
          {CHALLENGE_ORDER.map((cid) => {
            const m = CHALLENGES[cid]; const got = !!fragments[cid]
            return (
              <div key={cid} className={got ? 'evidence-note is-found' : 'evidence-note'} style={{ transform: `rotate(${(cid.charCodeAt(0) % 5 - 2) * 0.8}deg)` }}>
                <b style={{ color: got ? COLORS.amber : '#41506a' }}>{m.clueTag}</b><br />
                {got ? <><strong>{EPISODES[cid].evidence.title}</strong><span>{EPISODES[cid].evidence.body}</span></> : '（尚未取得——回到時光之門重現實驗）'}
              </div>
            )
          })}
        </div>

        <div className="evidence-section-title">◇ 假說檢定</div>
        <div className="hypothesis-grid">
          {HYPOTHESES.map((hypothesis) => {
            const locked = fragCount < hypothesis.unlockAt
            const tested = testedHypotheses.includes(hypothesis.id)
            const tone = hypothesis.verdict === 'supported' ? COLORS.green : hypothesis.verdict === 'rejected' ? COLORS.rose : COLORS.amber
            return (
              <div key={hypothesis.id} className={tested ? 'hypothesis-card is-tested' : 'hypothesis-card'}>
                <div className="hypothesis-title">{locked ? '🔒 未解鎖假說' : hypothesis.title}</div>
                <p>{locked ? `需要 ${hypothesis.unlockAt} 張殘頁才能建立模型。` : hypothesis.statement}</p>
                {tested ? (
                  <div className="hypothesis-result" style={{ borderColor: tone, color: tone }}>
                    {hypothesis.verdict === 'supported' ? '支持' : hypothesis.verdict === 'rejected' ? '排除' : '部分成立'}・{hypothesis.result}
                  </div>
                ) : (
                  <button disabled={locked} style={{ ...miniBtn, opacity: locked ? 0.4 : 1 }} onClick={() => testHypothesis(hypothesis.id)}>提交證據檢定</button>
                )}
              </div>
            )
          })}
        </div>

        {/* 提問區 */}
        <div className="evidence-section-title">◇ 向 AMP 提問</div>
        {SOUP_QUESTIONS.map((q) => {
          const asked = askedIds.includes(q.id)
          const locked = fragCount < q.unlockAt
          if (locked) {
            return (
              <div key={q.id} style={{ padding: '8px 12px', margin: '6px 0', borderRadius: 9, border: '1px solid #1c2740', color: '#3a4a66', fontSize: 12.5 }}>
                🔒 ？？？（需要 {q.unlockAt} 張殘頁解鎖）
              </div>
            )
          }
          if (asked) {
            const a = ansChip(q.answer)
            return (
              <div key={q.id} style={{ padding: '9px 12px', margin: '6px 0', borderRadius: 9, border: `1px solid ${a.c}55`, background: 'rgba(10,16,30,0.55)', fontSize: 13, lineHeight: 1.6 }}>
                <span style={{ color: COLORS.text }}>{q.text}</span>
                <span style={{ marginLeft: 10, padding: '1px 10px', borderRadius: 999, background: a.c, color: '#06121f', fontWeight: 800, fontSize: 12 }}>{a.t}</span>
                <div style={{ marginTop: 4, color: COLORS.dim, fontSize: 12 }}>{q.detail}</div>
              </div>
            )
          }
          return (
            <button key={q.id} style={{ ...choiceBtn, margin: '6px 0', opacity: left <= 0 ? 0.45 : 1, cursor: left <= 0 ? 'not-allowed' : 'pointer' }}
              disabled={left <= 0} onClick={() => askQuestion(q.id)}>
              ？ {q.text}
            </button>
          )
        })}
        {left <= 0 && <div style={{ marginTop: 8, color: COLORS.rose, fontSize: 12.5 }}>提問額度已用盡——帶著手上的證據去拼出真相吧。</div>}
      </div>
    </Fill>
  )
}

// ── 虛擬搖桿（手機/平板移動主角） ─────────────────────────────────────────
function TouchJoystick() {
  const BASE = 58, KNOB = 26, MAX = BASE - KNOB
  const [active, setActive] = useState(false)
  const [k, setK] = useState({ x: 0, y: 0 })
  const baseRef = useRef<HTMLDivElement>(null)
  const center = useRef({ x: 0, y: 0 })

  const apply = (cx: number, cy: number) => {
    let dx = cx - center.current.x, dy = cy - center.current.y
    const len = Math.hypot(dx, dy)
    if (len > MAX) { dx = (dx / len) * MAX; dy = (dy / len) * MAX }
    setK({ x: dx, y: dy })
    // 螢幕右 → 世界 +x；螢幕上 → 世界 -z（朝場景深處＝前進）
    setTouchMove(dx / MAX, dy / MAX)
  }
  const start = (e: React.PointerEvent) => {
    const r = baseRef.current!.getBoundingClientRect()
    center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    setActive(true); apply(e.clientX, e.clientY)
  }
  const move = (e: React.PointerEvent) => { if (active) apply(e.clientX, e.clientY) }
  const end = () => { setActive(false); setK({ x: 0, y: 0 }); setTouchMove(0, 0) }

  return (
    <div ref={baseRef} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
      style={{
        position: 'absolute', left: 24, bottom: 30, width: BASE * 2, height: BASE * 2, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(12,20,38,0.5) 60%, rgba(12,20,38,0.25) 100%)',
        border: '1.5px solid rgba(94,234,212,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        touchAction: 'none', pointerEvents: 'auto', zIndex: 60, boxShadow: '0 0 18px rgba(94,234,212,0.25)',
      }}>
      <div style={{
        position: 'absolute', left: '50%', top: '50%', width: KNOB * 2, height: KNOB * 2,
        marginLeft: -KNOB, marginTop: -KNOB, transform: `translate(${k.x}px, ${k.y}px)`, borderRadius: '50%',
        background: active ? 'rgba(94,234,212,0.9)' : 'rgba(94,234,212,0.55)',
        boxShadow: '0 0 16px rgba(94,234,212,0.7)', transition: active ? 'none' : 'transform 0.12s ease',
      }} />
    </div>
  )
}

// ── 樣式 ────────────────────────────────────────────────────────────────
function Fill({ children, dim = true }: { children: React.ReactNode; dim?: boolean }) {
  return <div className="screen-fill" style={{ position: 'absolute', inset: 0, zIndex: 90000000, display: 'grid', placeItems: 'center', background: dim ? 'rgba(4,6,12,0.82)' : 'radial-gradient(120% 120% at 50% 38%, rgba(4,6,12,0.12) 0%, rgba(4,6,12,0.82) 100%)', pointerEvents: 'auto', padding: 20 }}>{children}</div>
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
