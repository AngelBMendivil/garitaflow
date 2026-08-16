import { Car, PersonStanding } from 'lucide-react'
import LaneWaitCard from '@/components/LaneWaitCard'
import ScheduleButton from '@/components/ScheduleButton'
import type { LaneWaitTime, LaneCategory } from '@/lib/types'

interface Props {
  category: LaneCategory
  lanes: LaneWaitTime[]
  schedule?: string
  closed?: boolean
}

const labels: Record<LaneCategory, string> = {
  vehicle:    'Vehicular',
  pedestrian: 'Peatonal',
  pedwest:    'PedWest',
}

export default function LaneSection({ category, lanes, schedule, closed }: Props) {
  if (!lanes.length && !closed) return null

  return (
    <div className={`bg-white rounded-xl shadow-card border border-surface-border overflow-hidden ${closed ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border bg-surface-bg">
        <div className="flex items-center gap-2">
          {category === 'vehicle'
            ? <Car size={14} className="text-surface-muted" aria-hidden="true"/>
            : <PersonStanding size={14} className="text-surface-muted" aria-hidden="true"/>}
          <span className="text-[11px] font-bold text-surface-muted uppercase tracking-widest">
            {labels[category]}
          </span>
          {closed && (
            <span className="ml-1 text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
              Cerrado
            </span>
          )}
        </div>
        {schedule && <ScheduleButton schedule={schedule}/>}
      </div>

      {/* Content */}
      {closed ? (
        <div className="px-4 py-3 text-[12px] text-surface-muted text-center">
          Abre a las 6:00 a.m. · Horario: 6:00 a.m. – 2:00 p.m.
        </div>
      ) : (
        lanes.map(lane => <LaneWaitCard key={lane.id} lane={lane}/>)
      )}
    </div>
  )
}
