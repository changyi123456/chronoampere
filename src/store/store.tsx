// ============================================================================
// store.tsx — 外部狀態（useSyncExternalStore，不用 React Context）。
// 管理：場景、各關完成、線索、滑桿值、靠近的門、模擬 Play/Reset、拖曳中旗標。
// ============================================================================
import { useSyncExternalStore } from 'react'
import { CHALLENGE_ORDER, type ChallengeId, type Scene } from '../story/script'
import * as audio from '../game/audio'

const SAVE_KEY = 'chrono-save-v1'

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

type Solved = Partial<Record<ChallengeId, boolean>>

interface Data {
  scene: Scene
  solved: Solved
  values: Record<string, number>
  nearDoor: ChallengeId | null
  running: boolean
  resetToken: number
  dragging: boolean
  fragments: Partial<Record<ChallengeId, boolean>>
  dialogue: { speaker: string; lines: string[]; accent?: string } | null
  journalOpen: boolean
  muted: boolean
}

interface Actions {
  setScene: (s: Scene) => void
  setSolved: (id: ChallengeId) => void
  patch: (p: Record<string, number>) => void
  setNearDoor: (id: ChallengeId | null) => void
  setRunning: (b: boolean) => void
  doReset: () => void
  resetProgress: () => void
  setDragging: (b: boolean) => void
  setFragment: (id: ChallengeId) => void
  setDialogue: (d: { speaker: string; lines: string[]; accent?: string } | null) => void
  setJournalOpen: (b: boolean) => void
  toggleMuted: () => void
}

export type GameSnapshot = Data & Actions & { solvedCount: number; allSolved: boolean }

function load(): Pick<Data, 'solved' | 'values' | 'fragments'> {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Pick<Data, 'solved' | 'values' | 'fragments'>
      return { solved: p.solved ?? {}, values: { ...INITIAL_VALUES, ...(p.values ?? {}) }, fragments: p.fragments ?? {} }
    }
  } catch { /* ignore */ }
  return { solved: {}, values: { ...INITIAL_VALUES }, fragments: {} }
}

const loaded = load()
let data: Data = {
  scene: 'intro', solved: loaded.solved, values: loaded.values,
  nearDoor: null, running: false, resetToken: 0, dragging: false, fragments: loaded.fragments,
  dialogue: null, journalOpen: false, muted: false,
}

const listeners = new Set<() => void>()
let snapshot: GameSnapshot

function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ solved: data.solved, values: data.values, fragments: data.fragments })) } catch { /* ignore */ }
}
function isChallengeScene(s: Scene): s is ChallengeId {
  return (CHALLENGE_ORDER as string[]).includes(s)
}

const actions: Actions = {
  setScene: (scene) => {
    audio.sfx(isChallengeScene(scene) ? 'enter' : 'click')
    if (isChallengeScene(scene)) set({ scene, running: false, resetToken: data.resetToken + 1, dragging: false, dialogue: null, journalOpen: false })
    else set({ scene, running: false, dragging: false, dialogue: null, journalOpen: false })
  },
  setSolved: (id) => { if (!data.solved[id]) set({ solved: { ...data.solved, [id]: true } }) },
  patch: (p) => set({ values: { ...data.values, ...p } }),
  setNearDoor: (id) => { if (id !== data.nearDoor) set({ nearDoor: id }) },
  setRunning: (b) => { audio.sfx(b ? 'power' : 'click'); set({ running: b }) },
  doReset: () => { audio.sfx('click'); set({ running: false, resetToken: data.resetToken + 1 }) },
  resetProgress: () => set({ solved: {}, values: { ...INITIAL_VALUES }, fragments: {}, scene: 'hub', running: false, resetToken: data.resetToken + 1 }),
  setDragging: (b) => { if (b !== data.dragging) set({ dragging: b }) },
  setFragment: (id) => { if (!data.fragments[id]) { audio.sfx('fragment'); set({ fragments: { ...data.fragments, [id]: true } }) } },
  setDialogue: (d) => { if (d) audio.sfx('open'); set({ dialogue: d }) },
  setJournalOpen: (b) => { audio.sfx(b ? 'open' : 'close'); set({ journalOpen: b }) },
  toggleMuted: () => { const m = !data.muted; audio.setMuted(m); set({ muted: m }) },
}

function rebuild() {
  const solvedCount = CHALLENGE_ORDER.filter((id) => data.solved[id]).length
  snapshot = { ...data, ...actions, solvedCount, allSolved: solvedCount === CHALLENGE_ORDER.length }
}
function set(patch: Partial<Data>) {
  data = { ...data, ...patch }; persist(); rebuild(); listeners.forEach((l) => l())
}
rebuild()
function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb) }

export function useGame(): GameSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
}
