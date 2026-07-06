import Image from 'next/image'
import { Clock, RefreshCw } from 'lucide-react'

interface Props { lastUpdated: string | null; stale: boolean }

function relativeTime(iso: string | null): string {
  if (!iso) return 'Sin datos'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'ahora mismo'
  if (mins === 1) return 'hace 1 min'
  return `hace ${mins} min`
}

export default function HeaderStatus({ lastUpdated, stale }: Props) {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-surface-border">
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <Image src="/logo.png" alt="GaritaFlow" width={280} height={70} priority className="h-16 w-auto"/>
          <p className="text-[11px] text-surface-muted mt-1">Frontera Tijuana – San Diego</p>
        </div>
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot" aria-hidden="true"/>
          <span className="text-[11px] font-semibold text-green-700">En vivo</span>
        </div>
      </div>
      <div className="px-4 py-1.5 bg-surface-bg border-t border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-surface-muted">
          <Clock size={10} aria-hidden="true"/>
          <span>{stale ? '⚠️ Datos desactualizados' : `Actualizado ${relativeTime(lastUpdated)}`} · Fuente: CBP.gov</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-medium text-brand-blue">
          <RefreshCw size={10} aria-hidden="true"/>
          <span>Cada 5 min</span>
        </div>
      </div>
    </header>
  )
}
