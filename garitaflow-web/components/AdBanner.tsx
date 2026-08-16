'use client'
import { useState, useEffect } from 'react'

// ─── Configuración de anuncios ────────────────────────────────────────────────
const WA_URL = 'https://wa.me/16196508063'

const BANNER_ADS = [
  { src: '/ads/banner-1.jpg.png', url: WA_URL },                          // GaritaFlow WhatsApp
  { src: '/ads/banner-2.jpg.png', url: 'https://dratrinimendivil.com' }, // Dra. Trini
]

const RECTANGLE_ADS = [
  { src: '/ads/rect-1.jpg.png', url: WA_URL },
]

// ─── Tracking helper ──────────────────────────────────────────────────────────
function trackAdClick(variant: string, index: number) {
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    ;(window as any).dataLayer.push({
      event: 'ad_click',
      ad_variant: variant,
      ad_index: index,
    })
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────
interface Props {
  variant?: 'banner' | 'rectangle'
}

export default function AdBanner({ variant = 'banner' }: Props) {
  const ads = variant === 'banner' ? BANNER_ADS : RECTANGLE_ADS
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (ads.length <= 1) return
    const id = setInterval(() => setCurrent(i => (i + 1) % ads.length), 5000)
    return () => clearInterval(id)
  }, [ads.length])

  if (!ads.length) {
    return (
      <div className="w-full bg-gray-100 rounded-lg flex items-center justify-center py-6">
        <p className="text-xs text-gray-400">Espacio publicitario</p>
      </div>
    )
  }

  const ad = ads[current]!

  return (
    <div className="w-full">
      <a
        href={ad.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackAdClick(variant, current)}
        aria-label="Ver anuncio"
        className="block"
      >
        <img
          src={ad.src}
          alt="Publicidad"
          className="w-full h-auto block rounded-lg"
        />
      </a>
      <div className="flex items-center justify-between mt-1 px-0.5">
        <span className="text-[10px] text-gray-400">Publicidad</span>
        {ads.length > 1 && (
          <div className="flex gap-1">
            {ads.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === current ? 'bg-gray-500' : 'bg-gray-300'
                }`}
                aria-label={`Anuncio ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
