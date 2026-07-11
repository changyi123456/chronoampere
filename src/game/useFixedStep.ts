import { useCallback, useRef } from 'react'

export const FIXED_STEP = 1 / 60
const MAX_FRAME_DELTA = 0.1
const MAX_STEPS_PER_FRAME = 6

/**
 * Scene-owned fixed-step clock. Rendering can run at any frame rate while the
 * authoritative experiment advances in deterministic 1/60-second slices.
 */
export function useFixedStep() {
  const accumulator = useRef(0)

  return useCallback((frameDelta: number, active: boolean, step: (dt: number) => void) => {
    if (!active) {
      accumulator.current = 0
      return 0
    }

    accumulator.current += Math.min(Math.max(frameDelta, 0), MAX_FRAME_DELTA)
    let steps = 0
    while (accumulator.current >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME) {
      step(FIXED_STEP)
      accumulator.current -= FIXED_STEP
      steps++
    }

    // Drop an extreme backlog instead of creating a spiral of death.
    if (steps === MAX_STEPS_PER_FRAME) accumulator.current = 0
    return steps
  }, [])
}
