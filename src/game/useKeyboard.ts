// ============================================================================
// useKeyboard.ts — 自製鍵盤輸入（避免依賴 drei KeyboardControls 的匯入差異）。
// 回傳一個「持續存在」的 ref，內含目前按下的方向鍵狀態；不觸發 re-render。
// ============================================================================
import { useEffect, useRef } from 'react'

export interface KeyState {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  interact: boolean // E 鍵
}

export function useKeyboard() {
  const keys = useRef<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    interact: false,
  })

  useEffect(() => {
    const set = (code: string, down: boolean) => {
      switch (code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = down
          break
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = down
          break
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = down
          break
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = down
          break
        case 'KeyE':
          keys.current.interact = down
          break
      }
    }
    const onDown = (e: KeyboardEvent) => set(e.code, true)
    const onUp = (e: KeyboardEvent) => set(e.code, false)
    const clear = () => {
      keys.current = { forward: false, backward: false, left: false, right: false, interact: false }
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', clear)
    }
  }, [])

  return keys
}
