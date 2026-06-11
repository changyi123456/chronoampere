// ============================================================================
// textures.ts — 程序式 CanvasTexture 工廠（零外部美術資源）。
// 全部結果以 key 快取（同參數只生成一次）。
//   woodTexture      木紋（桌面/儀器底座，依年代色調）
//   blackboardTexture 黑板 + 粉筆公式（年代敘事 × 物理教學）
//   paperTexture     泛黃紙張（神秘紙條）
//   nebulaTexture    遠景星雲（hub 天球）
//   circuitTexture   時光電路盤（hub 地板發光紋路）
//   runeTexture      傳送門楔石符文
// ============================================================================
import * as THREE from 'three'

const cache = new Map<string, THREE.CanvasTexture>()

function makeTex(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')!
  draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  cache.set(key, tex)
  return tex
}

/** 木紋：縱向纖維 + 板縫 + 木節。tone 為底色（傳入各年代 desk 色）。 */
export function woodTexture(tone: string): THREE.CanvasTexture {
  return makeTex('wood:' + tone, 512, 512, (ctx, w, h) => {
    ctx.fillStyle = tone
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 170; i++) {
      const x = Math.random() * w
      ctx.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.09})`
      ctx.lineWidth = 1 + Math.random() * 2
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.bezierCurveTo(x + 9, h * 0.33, x - 9, h * 0.66, x + 5, h)
      ctx.stroke()
    }
    // 高光纖維
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * w
      ctx.strokeStyle = `rgba(255,235,200,${0.03 + Math.random() * 0.04})`
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (Math.random() - 0.5) * 16, h); ctx.stroke()
    }
    // 板縫
    ctx.strokeStyle = 'rgba(0,0,0,0.38)'
    ctx.lineWidth = 3
    for (let y = h / 4; y < h - 4; y += h / 4) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }
    // 木節
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * w, y = Math.random() * h
      const g = ctx.createRadialGradient(x, y, 1, x, y, 15)
      g.addColorStop(0, 'rgba(28,15,6,0.55)')
      g.addColorStop(1, 'rgba(28,15,6,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill()
    }
  })
}

/** 黑板：墨綠底 + 粉筆公式 + 板擦痕。lines 為公式列。 */
export function blackboardTexture(lines: string[]): THREE.CanvasTexture {
  return makeTex('bb:' + lines.join('|'), 1024, 640, (ctx, w, h) => {
    ctx.fillStyle = '#16261d'
    ctx.fillRect(0, 0, w, h)
    // 板擦霧痕
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * w, y = Math.random() * h
      const g = ctx.createRadialGradient(x, y, 4, x, y, 70)
      g.addColorStop(0, 'rgba(220,230,220,0.045)')
      g.addColorStop(1, 'rgba(220,230,220,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(x, y, 70, 0, Math.PI * 2); ctx.fill()
    }
    // 粉筆公式（每行微微歪斜，像手寫）
    const fs = Math.min(86, 560 / Math.max(...lines.map((l) => l.length)) * 2.0)
    lines.forEach((line, i) => {
      ctx.save()
      ctx.translate(w / 2, (h / (lines.length + 1)) * (i + 1))
      ctx.rotate((Math.random() - 0.5) * 0.05)
      ctx.font = `${fs}px "Comic Sans MS", "Segoe Print", cursive, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(238,242,235,0.92)'
      ctx.shadowColor = 'rgba(238,242,235,0.5)'
      ctx.shadowBlur = 2
      ctx.fillText(line, 0, 0)
      ctx.restore()
    })
    // 底部粉筆灰
    const g2 = ctx.createLinearGradient(0, h - 40, 0, h)
    g2.addColorStop(0, 'rgba(230,235,228,0)')
    g2.addColorStop(1, 'rgba(230,235,228,0.10)')
    ctx.fillStyle = g2
    ctx.fillRect(0, h - 40, w, 40)
  })
}

/** 泛黃紙張：米黃底 + 咖啡漬 + 折痕。 */
export function paperTexture(): THREE.CanvasTexture {
  return makeTex('paper', 256, 340, (ctx, w, h) => {
    ctx.fillStyle = '#ece1c4'
    ctx.fillRect(0, 0, w, h)
    // 邊緣泛黃
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.72)
    g.addColorStop(0, 'rgba(120,90,40,0)')
    g.addColorStop(1, 'rgba(120,90,40,0.30)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    // 咖啡漬
    for (let i = 0; i < 3; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 12 + Math.random() * 22
      ctx.strokeStyle = 'rgba(110,75,30,0.18)'
      ctx.lineWidth = 2 + Math.random() * 3
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.75, Math.random(), 0, Math.PI * 2); ctx.stroke()
    }
    // 折痕
    ctx.strokeStyle = 'rgba(90,70,40,0.25)'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(0, h * 0.5); ctx.lineTo(w, h * 0.52); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(w * 0.5, 0); ctx.lineTo(w * 0.48, h); ctx.stroke()
    // 墨跡字行
    for (let i = 0; i < 6; i++) {
      const y = h * 0.2 + i * h * 0.11
      ctx.strokeStyle = 'rgba(60,46,28,0.7)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(w * 0.16, y)
      for (let x = w * 0.16; x < w * (0.84 - i * 0.04); x += 7) {
        ctx.lineTo(x, y + (Math.random() - 0.5) * 4)
      }
      ctx.stroke()
    }
  })
}

/** 遠景星雲：透明底 + 數團色霧 + 亮星。貼在 hub 天球內面。 */
export function nebulaTexture(): THREE.CanvasTexture {
  return makeTex('nebula', 1024, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const blobs: [number, number, number, string][] = [
      [w * 0.22, h * 0.4, 190, '124,92,255'],   // 紫
      [w * 0.55, h * 0.62, 150, '56,189,248'],  // 青
      [w * 0.8, h * 0.3, 120, '94,234,212'],    // 蒂芬妮
      [w * 0.4, h * 0.22, 90, '255,174,66'],    // 微量琥珀
    ]
    for (const [x, y, r, rgb] of blobs) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgba(${rgb},0.22)`)
      g.addColorStop(0.55, `rgba(${rgb},0.08)`)
      g.addColorStop(1, `rgba(${rgb},0)`)
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    }
    // 亮星
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * w, y = Math.random() * h
      ctx.fillStyle = `rgba(235,245,255,${0.25 + Math.random() * 0.55})`
      ctx.beginPath(); ctx.arc(x, y, Math.random() * 1.4 + 0.3, 0, Math.PI * 2); ctx.fill()
    }
  })
}

/** 時光電路盤：同心圓 + 放射線 + L 型走線 + 節點（hub 地板疊加發光層）。 */
export function circuitTexture(): THREE.CanvasTexture {
  return makeTex('circuit', 1024, 1024, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const cx = w / 2, cy = h / 2
    ctx.strokeStyle = 'rgba(94,234,212,0.5)'
    ctx.fillStyle = 'rgba(94,234,212,0.8)'
    // 同心圓
    for (const r of [0.16, 0.3, 0.46, 0.62, 0.78, 0.93]) {
      ctx.lineWidth = r > 0.6 ? 1.2 : 2
      ctx.beginPath(); ctx.arc(cx, cy, r * w * 0.5, 0, Math.PI * 2); ctx.stroke()
    }
    // 六向放射主線（對應六道門）+ 節點
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * w * 0.09, cy + Math.sin(a) * w * 0.09)
      ctx.lineTo(cx + Math.cos(a) * w * 0.47, cy + Math.sin(a) * w * 0.47)
      ctx.stroke()
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * w * 0.31, cy + Math.sin(a) * w * 0.31, 6, 0, Math.PI * 2); ctx.fill()
    }
    // L 型電路走線
    ctx.lineWidth = 1.4
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2
      const r0 = (0.18 + Math.random() * 0.66) * w * 0.5
      const x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0
      const len1 = 16 + Math.random() * 50, len2 = 12 + Math.random() * 36
      const dir = Math.random() < 0.5 ? 1 : -1
      ctx.strokeStyle = 'rgba(94,234,212,0.32)'
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x0 + Math.cos(a) * len1, y0 + Math.sin(a) * len1)
      ctx.lineTo(x0 + Math.cos(a) * len1 + Math.cos(a + dir * Math.PI / 2) * len2, y0 + Math.sin(a) * len1 + Math.sin(a + dir * Math.PI / 2) * len2)
      ctx.stroke()
      ctx.beginPath(); ctx.arc(x0, y0, 2.4, 0, Math.PI * 2); ctx.fill()
    }
  })
}

/** 傳送門楔石符文：發光字符。 */
export function runeTexture(sym: string, color: string): THREE.CanvasTexture {
  return makeTex('rune:' + sym + color, 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.font = '86px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = color
    ctx.shadowBlur = 18
    ctx.fillStyle = color
    ctx.fillText(sym, w / 2, h / 2 + 4)
    ctx.shadowBlur = 4
    ctx.fillStyle = '#ffffff'
    ctx.fillText(sym, w / 2, h / 2 + 4)
  })
}
