import { ShieldCheck } from 'lucide-react'
import type { BorderCrossing, ConfidenceLevel } from '@/lib/types'

const levelConfig: Record<ConfidenceLevel, { label: string; cls: string; barCls: string; width: string }> = {
  low:    { label: 'Baja — sin histórico',    cls: 'bg-orange-50 text-orange-700 border-orange-200', barCls: 'bg-orange-400', width: 'w-[30%]' },
  medium: { label: 'Media — datos parciales', cls: 'bg-amber-50 text-amber-700 border-amber-200',    barCls: 'bg-amber-400',  width: 'w-[60%]' },
  high:   { label: 'Alta — histórico sólido', cls: 'bg-green-50 text-green-700 border-green-200',    barCls: 'bg-green-500',  width: 'w-[90%]' },
}

export default function ConfidenceCard({ crossing }: { crossing: BorderCrossing }) {
  const cfg = levelConfig[crossing.confidence]
  return (
    <div className="bg-white rounded-xl shadow-card border border-surface-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-surface-muted" aria-hidden="true"/>
          <span className="text-[13px] font-semibold text-brand-navy">Confianza del dato</span>
        </div>
        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${cfg.cls}`}>
          {cfg.label}
        </span>
      </div>

      <div className="h-1.5 bg-surface-border rounded-full mb-3">
        <div className={`h-full rounded-full ${cfg.barCls} ${cfg.width} transition-all`}/>
      </div>

      <div className="flex justify-between mb-3">
        <span className="text-[10px] text-surface-muted">Datos en tiempo real de CBP</span>
        <span className="text-[10px] text-surface-muted">Mejora con el tiempo</span>
      </div>

      <div className="bg-surface-bg rounded-lg p-3">
        <p className="text-[11px] text-surface-muted leading-relaxed">
          Los tiempos pueden variar por inspecciones, operativos o cambios en carriles abiertos.
          Siempre verifica antes de cruzar.
        </p>
      </div>
    </div>
  )
}