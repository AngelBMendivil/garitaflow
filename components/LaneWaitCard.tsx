import { Car, BadgeCheck, Zap, PersonStanding } from 'lucide-react'
import StatusChip from '@/components/ui/StatusChip'
import type { LaneWaitTime, WaitStatus } from '@/lib/types'

const waitColor: Record<WaitStatus, string> = {
  fast:     'text-wait-fast',
  moderate: 'text-wait-moderate',
  high:     'text-wait-high',
  critical: 'text-wait-critical',
}

const iconBg: Record<string, string> = {
  'general-vehicle':    'bg-slate-100 text-slate-500',
  'ready-lane':         'bg-blue-50 text-brand-blue',
  'sentri':             'bg-purple-50 text-purple-600',
  'general-pedestrian': 'bg-slate-100 text-slate-500',
}

function LaneIcon({ icon }: { icon: LaneWaitTime['icon'] }) {
  const cls = `w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg[icon] ?? 'bg-slate-100 text-slate-500'}`
  const sz = 17
  return (
    <div className={cls} aria-hidden="true">
      {icon === 'general-vehicle'    && <Car size={sz}/>}
      {icon === 'ready-lane'         && <BadgeCheck size={sz}/>}
      {icon === 'sentri'             && <Zap size={sz}/>}
      {icon === 'general-pedestrian' && <PersonStanding size={sz}/>}
    </div>
  )
}

export default function LaneWaitCard({ lane }: { lane: LaneWaitTime }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <LaneIcon icon={lane.icon}/>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-brand-navy leading-tight">{lane.name}</p>
          <p className="text-[11px] text-surface-muted mt-0.5">{lane.description}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
        <span className={`text-[22px] font-bold leading-none tabular-nums ${waitColor[lane.status]}`}>
          {lane.waitMinutes != null ? `${lane.waitMinutes}` : '—'}
          <span className="text-[13px] font-medium ml-0.5">min</span>
        </span>
        <StatusChip status={lane.status} size="xs"/>
      </div>
    </div>
  )
}