// ============================================================================
// useSettle.ts — 「放開穩定才算數」確認閘。
// 在關卡的 useFrame 內呼叫 check(signature, dragging)：
//   只有當參數簽章 signature 連續 dwell 秒沒有改變、且目前未在拖曳，
//   才回傳 true。避免滑桿「掃過」目標值的瞬間就誤判過關。
// ============================================================================
import { useRef } from 'react'

export function useSettle(dwell = 0.5) {
  const sig = useRef('')
  const acc = useRef(0)
  return (signature: string, dragging: boolean, delta: number) => {
    if (signature !== sig.current || dragging) {
      sig.current = signature
      acc.current = 0
    } else {
      acc.current += Math.min(Math.max(delta, 0), 0.1)
    }
    return !dragging && acc.current >= dwell
  }
}
