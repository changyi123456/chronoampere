// ============================================================================
// touch.ts — 觸控搖桿輸入（手機/平板）。HUD 虛擬搖桿寫入此 singleton，
// 3D 玩家迴圈（HubScene）每幀讀取，與鍵盤輸入合併。類比向量 -1..1。
// ============================================================================
export const touch = {
  x: 0, // 平移：+ 右、- 左
  z: 0, // 前後：+ 後、- 前（對應世界 z 軸）
  interact: false,
}

export function setTouchMove(x: number, z: number) { touch.x = x; touch.z = z }
export function setTouchInteract(v: boolean) { touch.interact = v }
export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
}
