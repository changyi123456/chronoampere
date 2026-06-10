// 共用視覺常數（深空科幻調性）+ 六關「年代主題」設定（資料驅動）
import type { ChallengeId } from './story/script'

export const COLORS = {
  bg: '#070b18',
  floor: '#0b1320',
  wall: '#0d1a26',
  teal: '#5eead4',
  amber: '#fbbf24',
  blue: '#38bdf8',
  rose: '#fb7185',
  indigo: '#818cf8',
  green: '#34d399',
  text: '#e7eef7',
  dim: '#7c8aa0',
}

// 六道門在 hub 圓周上的座標（半徑 9）
export const DOOR_RADIUS = 9

export interface EraTheme {
  year: string
  place: string
  bg: string
  fogNear: number
  fogFar: number
  wall: string
  desk: string
  ambient: number
  keyColor: string
  keyIntensity: number
  fillColor: string
  windowGlow: string
  candle?: boolean
  dark?: boolean
  notePos: [number, number, number]
}

export const ERAS: Record<ChallengeId, EraTheme> = {
  lamp: {
    year: '1827', place: '德國・科隆 — 歐姆的書房',
    bg: '#191009', fogNear: 14, fogFar: 40, wall: '#2a1c10', desk: '#6e4a26',
    ambient: 0.22, keyColor: '#ffd9a0', keyIntensity: 0.9, fillColor: '#6a5030',
    windowGlow: '#3a4a6a', candle: true, notePos: [3.9, 0.02, 1.6],
  },
  split: {
    year: '1845', place: '普魯士・柯尼斯堡 — 克希何夫的書齋',
    bg: '#1a2026', fogNear: 16, fogFar: 44, wall: '#39414c', desk: '#7a5a33',
    ambient: 0.35, keyColor: '#dfe9ff', keyIntensity: 1.2, fillColor: '#8a93a8',
    windowGlow: '#bcd4f0', candle: false, notePos: [-4.2, 0.02, 1.8],
  },
  cyclo: {
    year: '1897', place: '英國・劍橋 — 卡文迪西實驗室',
    bg: '#06090d', fogNear: 12, fogFar: 36, wall: '#101820', desk: '#3a3128',
    ambient: 0.12, keyColor: '#9fd4c8', keyIntensity: 0.45, fillColor: '#1d3a3a',
    windowGlow: '#16242e', dark: true, notePos: [3.6, 0.02, 2.2],
  },
  maglock: {
    year: '1897', place: '德國・斯特拉斯堡 — 布勞恩的暗室',
    bg: '#050a07', fogNear: 12, fogFar: 36, wall: '#0e1812', desk: '#383028',
    ambient: 0.12, keyColor: '#a8e0b8', keyIntensity: 0.4, fillColor: '#16301f',
    windowGlow: '#101c14', dark: true, notePos: [-4.4, 0.02, 2.0],
  },
  dynamo: {
    year: '1831', place: '英國・倫敦 — 皇家研究院地下實驗室',
    bg: '#140f0a', fogNear: 13, fogFar: 38, wall: '#33231a', desk: '#5e4326',
    ambient: 0.24, keyColor: '#ffcf8a', keyIntensity: 0.95, fillColor: '#5a452c',
    windowGlow: '#23314a', candle: true, notePos: [4.2, 0.02, 1.4],
  },
  xfmr: {
    year: '1885', place: '布達佩斯 — 岡茨工廠・交流電的黎明',
    bg: '#171210', fogNear: 15, fogFar: 42, wall: '#2e2620', desk: '#4f4538',
    ambient: 0.28, keyColor: '#ffc878', keyIntensity: 1.0, fillColor: '#6a5638',
    windowGlow: '#d98a3a', candle: false, notePos: [-4.0, 0.02, 1.7],
  },
}
