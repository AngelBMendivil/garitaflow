'use client'
import { useState, useEffect } from 'react'

type Variant = 'banner' | 'rectangle'

const BANNER_IMAGES = [
  '/ads/banner-1.jpg.png',
  // agrega más: '/ads/banner-2.png'
]

const RECTANGLE_IMAGES = [
  '/ads/rect-1.jpg.png',
  // agrega más: '/ads/rect-2.png'
]

export default function AdBanner({ variant = 'banner' }: { variant?: Variant }) {
  const images = variant === 'rectangle' ? RECTANGLE_IMAGES : BANNER_IMAGES
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    const timer = setInterval(() => setCurrent(i => (i + 1) % images.length), 5000)
    return () => clearInterval(timer)
  }, [images.length])

  const src = images[current]

  if (!src) {
    return (
      <div className="w-full rounded-xl border border-dashed border-surface-border bg-white flex items-center justify-center h-[100px]">
        <span className="text-[10px] font-semibold text-surface-muted uppercase tracking-widest">Espacio publicitario</span>
      </div>
    )
  }

  return (
    <div className="w-full rounded-xl overflow-hidden relative" aria-label="Publicidad">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Publicidad"
        className="w-full h-auto block"
      />

      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{ background: i === current ? 'white' : 'rgba(255,255,255,0.45)' }}
            />
          ))}
        </div>
      )}

      <p className="text-[9px] text-surface-muted text-right pr-1 bg-white">Publicidad</p>
    </div>
  )
}