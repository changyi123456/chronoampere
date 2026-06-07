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
  return (signature: string, dragging: boolean) => {
    if (signature !== sig.current) { sig.current = signature; acc.current = 0 }
    else acc.current += 1 / 60
    return !dragging && acc.current >= dwell
  }
}
