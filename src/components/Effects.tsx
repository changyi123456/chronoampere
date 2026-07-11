// ============================================================================
// Effects.tsx — 後製渲染管線（AAA 質感的關鍵層）。
//   Bloom：luminanceThreshold=1 → 只有 toneMapped={false} 的高亮物件會泛光。
//   Vignette：四角壓暗，電影感聚焦。
//   ChromaticAberration：intro 隧道強化、平時極輕量。
//   multisampling=0：MSAA 與反射地板/部分驅動互衝會閃爍；Bloom 已柔化邊緣。
// ============================================================================
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import type { Scene } from '../story/script'

export function Effects({ scene, quality }: { scene: Scene; quality: 'low' | 'high' }) {
  const warp = scene === 'intro'
  if (quality === 'low') {
    return (
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={warp ? 0.85 : 0.62} luminanceThreshold={1.1} luminanceSmoothing={0.16} />
      </EffectComposer>
    )
  }
  if (warp) {
    return (
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={1.2} luminanceThreshold={1.0} luminanceSmoothing={0.2} />
        <ChromaticAberration offset={[0.0022, 0.0014]} radialModulation modulationOffset={0.4} />
        <Vignette eskil={false} offset={0.18} darkness={0.85} />
      </EffectComposer>
    )
  }
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={0.85} luminanceThreshold={1.0} luminanceSmoothing={0.2} />
      <Vignette eskil={false} offset={0.18} darkness={0.62} />
    </EffectComposer>
  )
}
