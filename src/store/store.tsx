import { useSyncExternalStore } from 'react'
import { CHALLENGE_ORDER, QUESTION_BUDGET, type ChallengeId, type Scene } from '../story/script'
import { EPISODES, HYPOTHESES, getAct, type ActDefinition, type EndingId } from '../story/narrative'
import type { EmSample } from '../game/physics'
import { emMeasureRadius, emRatio } from '../game/physics'
import * as audio from '../game/audio'

const SAVE_VERSION = 3
const SAVE_KEY = 'chrono-save-v3'
const LEGACY_SAVE_KEY = 'chrono-save-v2'

export const INITIAL_VALUES: Record<string, number> = {
  lamp_eps: 6,
  lamp_rv: 10,
  split_eps: 6,
  split_r2: 20,
  emacc_V: 150,
  emacc_I: 1.5,
  crt_Va: 2000,
  crt_Vd: 0,
  crt_B: 0,
  dynamo_N: 60,
  dynamo_w: 8,
  xfmr_n2: 60,
  xfmr_v1: 120,
}

type ChallengeFlags = Partial<Record<ChallengeId, boolean>>
type Predictions = Partial<Record<ChallengeId, number>>

interface Persisted {
  schemaVersion: number
  solved: ChallengeFlags
  values: Record<string, number>
  fragments: ChallengeFlags
  leftNotes: ChallengeFlags
  predictions: Predictions
  askedIds: string[]
  testedHypotheses: string[]
  emLog: EmSample[]
  finaleWrong: number
  endingChoice: EndingId | null
}

interface Data extends Persisted {
  scene: Scene
  nearDoor: ChallengeId | null
  running: boolean
  resetToken: number
  dragging: boolean
  dialogue: { speaker: string; lines: string[]; accent?: string } | null
  journalOpen: boolean
  evidenceOpen: boolean
  muted: boolean
}

interface Actions {
  setScene: (scene: Scene) => void
  setSolved: (id: ChallengeId) => void
  patch: (patch: Record<string, number>) => void
  setNearDoor: (id: ChallengeId | null) => void
  setRunning: (running: boolean) => void
  doReset: () => void
  resetProgress: () => void
  setDragging: (dragging: boolean) => void
  recordPrediction: (id: ChallengeId, option: number) => void
  leaveNote: (id: ChallengeId) => void
  setFragment: (id: ChallengeId) => void
  setDialogue: (dialogue: Data['dialogue']) => void
  setJournalOpen: (open: boolean) => void
  setEvidenceOpen: (open: boolean) => void
  askQuestion: (id: string) => void
  testHypothesis: (id: string) => void
  recordEm: () => void
  clearEmLog: () => void
  bumpFinaleWrong: () => void
  chooseEnding: (ending: EndingId) => void
  toggleMuted: () => void
}

export type GameSnapshot = Data & Actions & {
  solvedCount: number
  fragmentCount: number
  notesCount: number
  allSolved: boolean
  allFragments: boolean
  storyReady: boolean
  currentAct: ActDefinition
}

function isChallengeId(value: string): value is ChallengeId {
  return (CHALLENGE_ORDER as string[]).includes(value)
}

function cleanFlags(value: unknown): ChallengeFlags {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value).filter(([key, flag]) => isChallengeId(key) && flag === true),
  ) as ChallengeFlags
}

function cleanValues(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return { ...INITIAL_VALUES }
  const valid = Object.fromEntries(
    Object.entries(value).filter(([key, number]) => key in INITIAL_VALUES && typeof number === 'number' && Number.isFinite(number)),
  ) as Record<string, number>
  return { ...INITIAL_VALUES, ...valid }
}

function cleanPredictions(value: unknown): Predictions {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value).filter(([key, option]) => isChallengeId(key) && Number.isInteger(option) && (option as number) >= 0 && (option as number) <= 3),
  ) as Predictions
}

function cleanEmLog(value: unknown): EmSample[] {
  if (!Array.isArray(value)) return []
  return value.filter((sample): sample is EmSample => {
    if (!sample || typeof sample !== 'object') return false
    const candidate = sample as Partial<EmSample>
    return [candidate.V, candidate.I, candidate.r, candidate.est].every((number) => typeof number === 'number' && Number.isFinite(number))
  }).slice(-24)
}

function hydrate(value: unknown): Persisted {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const fragments = cleanFlags(source.fragments)
  const allowedHypotheses = new Set(HYPOTHESES.map((hypothesis) => hypothesis.id))
  const ending = source.endingChoice
  return {
    schemaVersion: SAVE_VERSION,
    solved: cleanFlags(source.solved),
    values: cleanValues(source.values),
    fragments,
    // v2 migration: a collected fragment implies that its note-closing action already happened.
    leftNotes: source.leftNotes ? cleanFlags(source.leftNotes) : { ...fragments },
    predictions: cleanPredictions(source.predictions),
    askedIds: Array.isArray(source.askedIds) ? source.askedIds.filter((id): id is string => typeof id === 'string').slice(0, QUESTION_BUDGET) : [],
    testedHypotheses: Array.isArray(source.testedHypotheses)
      ? source.testedHypotheses.filter((id): id is string => typeof id === 'string' && allowedHypotheses.has(id))
      : [],
    emLog: cleanEmLog(source.emLog),
    finaleWrong: typeof source.finaleWrong === 'number' && Number.isFinite(source.finaleWrong) ? Math.max(0, Math.floor(source.finaleWrong)) : 0,
    endingChoice: ending === 'stabilize' || ending === 'liberate' || ending === 'rewrite' ? ending : null,
  }
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(LEGACY_SAVE_KEY)
    if (raw) return hydrate(JSON.parse(raw))
  } catch {
    // Corrupt or unavailable storage falls back to a clean, versioned snapshot.
  }
  return hydrate({})
}

function getInitialScene(): Scene {
  const isLocalQa = location.hostname === '127.0.0.1' || location.hostname === 'localhost'
  if (!isLocalQa) return 'intro'
  const requested = new URLSearchParams(location.search).get('scene')
  if (requested === 'intro' || requested === 'hub' || requested === 'finale' || (requested !== null && isChallengeId(requested))) return requested
  return 'intro'
}

const loaded = load()
let data: Data = {
  ...loaded,
  scene: getInitialScene(),
  nearDoor: null,
  running: false,
  resetToken: 0,
  dragging: false,
  dialogue: null,
  journalOpen: false,
  evidenceOpen: false,
  muted: false,
}

const listeners = new Set<() => void>()
let snapshot: GameSnapshot
let persistTimer: number | null = null

function persist() {
  try {
    const payload: Persisted = {
      schemaVersion: SAVE_VERSION,
      solved: data.solved,
      values: data.values,
      fragments: data.fragments,
      leftNotes: data.leftNotes,
      predictions: data.predictions,
      askedIds: data.askedIds,
      testedHypotheses: data.testedHypotheses,
      emLog: data.emLog,
      finaleWrong: data.finaleWrong,
      endingChoice: data.endingChoice,
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
  } catch {
    // The game remains playable when storage is blocked or full.
  }
}

function schedulePersist() {
  if (persistTimer !== null) window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    persistTimer = null
    persist()
  }, 180)
}

function isChallengeScene(scene: Scene): scene is ChallengeId {
  return isChallengeId(scene)
}

const actions: Actions = {
  setScene: (scene) => {
    const fragmentCount = CHALLENGE_ORDER.filter((id) => data.fragments[id]).length
    if (isChallengeScene(scene) && EPISODES[scene].act > getAct(fragmentCount).id) {
      audio.sfx('wrong')
      return
    }
    audio.sfx(isChallengeScene(scene) ? 'enter' : 'click')
    const base = { scene, running: false, dragging: false, dialogue: null, journalOpen: false, evidenceOpen: false }
    update(isChallengeScene(scene) ? { ...base, resetToken: data.resetToken + 1 } : base, false)
  },
  setSolved: (id) => {
    if (!data.solved[id]) update({ solved: { ...data.solved, [id]: true } })
  },
  patch: (patch) => update({ values: { ...data.values, ...patch } }),
  setNearDoor: (nearDoor) => {
    if (nearDoor !== data.nearDoor) update({ nearDoor }, false)
  },
  setRunning: (running) => {
    if (running === data.running) return
    if (running && isChallengeScene(data.scene) && data.predictions[data.scene] === undefined && !data.fragments[data.scene]) return
    audio.sfx(running ? 'power' : 'click')
    update({ running }, false)
  },
  doReset: () => {
    audio.sfx('click')
    update({ running: false, resetToken: data.resetToken + 1 }, false)
  },
  resetProgress: () => update({
    schemaVersion: SAVE_VERSION,
    solved: {},
    values: { ...INITIAL_VALUES },
    fragments: {},
    leftNotes: {},
    predictions: {},
    askedIds: [],
    testedHypotheses: [],
    emLog: [],
    finaleWrong: 0,
    endingChoice: null,
    scene: 'hub',
    running: false,
    resetToken: data.resetToken + 1,
  }),
  setDragging: (dragging) => {
    if (dragging !== data.dragging) update({ dragging }, false)
  },
  recordPrediction: (id, option) => {
    if (data.predictions[id] !== undefined || !Number.isInteger(option) || option < 0 || option > 3) return
    audio.sfx('click')
    update({ predictions: { ...data.predictions, [id]: option } })
  },
  leaveNote: (id) => {
    if (!data.solved[id] || data.leftNotes[id]) return
    audio.sfx('reveal')
    update({ leftNotes: { ...data.leftNotes, [id]: true } })
  },
  setFragment: (id) => {
    if (!data.leftNotes[id] || data.fragments[id]) return
    audio.sfx('fragment')
    update({ fragments: { ...data.fragments, [id]: true } })
  },
  setDialogue: (dialogue) => {
    if (dialogue) audio.sfx('open')
    update({ dialogue }, false)
  },
  setJournalOpen: (journalOpen) => {
    audio.sfx(journalOpen ? 'open' : 'close')
    update({ journalOpen }, false)
  },
  setEvidenceOpen: (evidenceOpen) => {
    audio.sfx(evidenceOpen ? 'open' : 'close')
    update({ evidenceOpen }, false)
  },
  askQuestion: (id) => {
    if (data.askedIds.includes(id) || data.askedIds.length >= QUESTION_BUDGET) return
    audio.sfx('open')
    update({ askedIds: [...data.askedIds, id] })
  },
  testHypothesis: (id) => {
    const hypothesis = HYPOTHESES.find((candidate) => candidate.id === id)
    const fragmentCount = CHALLENGE_ORDER.filter((challengeId) => data.fragments[challengeId]).length
    if (!hypothesis || hypothesis.unlockAt > fragmentCount || data.testedHypotheses.includes(id)) return
    audio.sfx(hypothesis.verdict === 'supported' ? 'correct' : hypothesis.verdict === 'rejected' ? 'wrong' : 'open')
    update({ testedHypotheses: [...data.testedHypotheses, id] })
  },
  recordEm: () => {
    const V = data.values.emacc_V
    const I = data.values.emacc_I
    const r = emMeasureRadius(V, I)
    const est = emRatio(V, I, r)
    audio.sfx('correct')
    update({ emLog: [...data.emLog, { V, I, r, est }].slice(-24) })
  },
  clearEmLog: () => {
    audio.sfx('click')
    update({ emLog: [] })
  },
  bumpFinaleWrong: () => update({ finaleWrong: data.finaleWrong + 1 }),
  chooseEnding: (endingChoice) => {
    const storyReady = CHALLENGE_ORDER.every((id) => data.fragments[id] && data.leftNotes[id])
    if (!storyReady) return
    audio.sfx('reveal')
    update({ endingChoice })
  },
  toggleMuted: () => {
    const muted = !data.muted
    audio.setMuted(muted)
    update({ muted }, false)
  },
}

function rebuild() {
  const solvedCount = CHALLENGE_ORDER.filter((id) => data.solved[id]).length
  const fragmentCount = CHALLENGE_ORDER.filter((id) => data.fragments[id]).length
  const notesCount = CHALLENGE_ORDER.filter((id) => data.leftNotes[id]).length
  snapshot = {
    ...data,
    ...actions,
    solvedCount,
    fragmentCount,
    notesCount,
    allSolved: solvedCount === CHALLENGE_ORDER.length,
    allFragments: fragmentCount === CHALLENGE_ORDER.length,
    storyReady: fragmentCount === CHALLENGE_ORDER.length && notesCount === CHALLENGE_ORDER.length,
    currentAct: getAct(fragmentCount),
  }
}

function update(patch: Partial<Data>, persistent = true) {
  data = { ...data, ...patch }
  if (persistent) schedulePersist()
  rebuild()
  listeners.forEach((listener) => listener())
}

rebuild()

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function useGame(): GameSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
}
