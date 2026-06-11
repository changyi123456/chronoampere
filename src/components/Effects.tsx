// ============================================================================
// Effects.tsx — 後製渲染管線（AAA 質感的關鍵層）。
//   Bloom：luminanceThreshold=1 → 只有 toneMapped={false} 的高亮物件會泛光
//          （時光之門、發光邊條、燈絲、儀表指示、燭焰），場景其餘保持乾淨。
//   Vignette：四角壓暗，電影感聚焦。
//   ChromaticAberration：僅在 intro（時空穿梭隧道）開啟，強化扭曲穿越感。
// ============================================================================
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import type { Scene } from '../story/script'

export function Effects({ scene }: { scene: Scene }) {
  const warp = scene === 'intro'
  return (
    {/* multisampling=0：MSAA 與反射地板/部分驅動互衝會閃爍；Bloom 本身已柔化邊緣 */}
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={warp ? 1.2 : 0.85} luminanceThreshold={1.0} luminanceSmoothing={0.2} />
      {warp
        ? <ChromaticAberration offset={[0.0022, 0.0014]} radialModulation modulationOffset={0.4} />
        : <ChromaticAberration offset={[0.0004, 0.0002]} radialModulation modulationOffset={0.8} 