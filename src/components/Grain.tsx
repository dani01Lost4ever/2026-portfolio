import { useEffect, useRef } from 'react'

function makeNoiseUrl(size: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (Math.random() * 255) | 0
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL()
}

export default function Grain() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current!
    let raf: number
    let last = 0

    function tick(time: number) {
      // Regenerate ~12 fps — visible film-grain flicker
      if (time - last > 150) {
        el.style.backgroundImage = `url(${makeNoiseUrl(200)})`
        last = time
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundSize: '200px 200px',
        backgroundRepeat: 'repeat',
        pointerEvents: 'none',
        zIndex: 9990,
        opacity: 0.022,
        mixBlendMode: 'overlay',
      }}
    />
  )
}
