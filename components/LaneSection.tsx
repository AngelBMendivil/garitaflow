import { Car, PersonStanding } from 'lucide-react'
import LaneWaitCard from '@/components/LaneWaitCard'
import ScheduleButton from '@/components/ScheduleButton'
import type { LaneWaitTime, LaneCategory } from '@/lib/types'

interface Props { category: LaneCategory; lanes: LaneWaitTime[]; schedule?: string }

const labels: Record<LaneCategory, string> = {
  vehicle:    'Vehicular',
  pedestrian: 'Peatonal',
  pedwest:    'PedWest',
}

export default function LaneSection({ category, lanes, schedule }: Props) {
  if (!lanes.length) return null
  return (
    <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border bg-surface-bg">
        <div className="flex items-center gap-2">
          {category === 'vehicle'
            ? <Car size={14} className="text-surface-muted" aria-hidden="true"/>
            : <PersonStanding size={14} className="text-surface-muted" aria-hidden="true"/>}
          <span className="text-[11px] font-bold text-surface-muted uppercase tracking-widest">{labels[category]}</span>
        </div>
        {schedule && <ScheduleButton schedule={schedule}/>}
      </div>
      {lanes.map(lane => <LaneWaitCard key={lane.id} lane={lane}/>)}
    </div>
  )
}