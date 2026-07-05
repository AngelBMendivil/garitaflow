import { Star } from 'lucide-react'
import StatusChip from '@/components/ui/StatusChip'
import type { BorderCrossing, LaneWaitTime } from '@/lib/types'
import { getWorstLane } from '@/lib/types'

function bestInGroup(lanes: LaneWaitTime[], categories: string[], excludeSentri = false) {
  return lanes
    .filter(l =>
      categories.includes(l.category) &&
      l.waitMinutes !== null &&
      (!excludeSentri || l.icon !== 'sentri')
    )
    .sort((a, b) => (a.waitMinutes ?? 999) - (b.waitMinutes ?? 999))[0] ?? null
}

export default function CrossingSummaryCard({ crossing }: { crossing: BorderCrossing }) {
  const bestVehicle    = bestInGroup(crossing.lanes, ['vehicle'], true)
  const bestPedestrian = bestInGroup(crossing.lanes, ['pedestrian', 'pedwest'])
  const worst          = getWorstLane(crossing.lanes)
  const showWarning    = worst && worst.waitMinutes !== null && worst.waitMinutes > 45

  return (
    <div className="bg-white rounded-xl shadow-card border border-surface-border p-4">
      <div className="flex items-start justify-between mb-3">
        <h2 className="text-[18px] font-bold text-brand-navy">{crossing.name}</h2>
        <StatusChip status={crossing.overallStatus}/>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Star size={11} className="text-brand-blue" aria-hidden="true"/>
          <span className="text-[10px] font-bold text-brand-blue uppercase tracking-widest">Mejor opción ahora</span>
        </div>

        {bestVehicle && (
          <p className="text-[13px] font-semibold text-brand-navy leading-snug">
            🚗 {bestVehicle.name} vehicular — {bestVehicle.waitMinutes} min
          </p>
        )}

        {bestPedestrian && (
          <p className="text-[13px] font-semibold text-brand-navy leading-snug">
            🚶 {bestPedestrian.name} peatonal — {bestPedestrian.waitMinutes} min
          </p>
        )}

        {showWarning && worst && (
          <p className="text-[11px] text-brand-blue mt-1">
            Evita {worst.name}: {worst.waitMinutes} min de espera
          </p>
        )}
      </div>
    </div>
  )
}