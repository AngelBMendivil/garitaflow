type Status = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'

type LaneRowProps = {
  laneType: string
  estimatedWait: number | null
  status: Status
}

const pillStyles: Record<Status, string> = {
  GREEN:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  YELLOW:  'bg-amber-50 text-amber-700 border border-amber-200',
  RED:     'bg-rose-50 text-rose-700 border border-rose-200',
  UNKNOWN: 'bg-gray-50 text-gray-400 border border-gray-200',
}

const laneConfig: Record<string, { label: string; icon: string; sublabel?: string }> = {
  GENERAL:     { label: 'General',       icon: '🚗', sublabel: 'Carril estándar' },
  READY:       { label: 'Ready Lane',    icon: '✅', sublabel: 'Tarjeta RFID requerida' },
  SENTRI:      { label: 'SENTRI / NEXUS',icon: '⚡', sublabel: 'Programa de viajero confiable' },
  GENERAL_PED: { label: 'General',       icon: '🚶', sublabel: 'Carril peatonal estándar' },
  READY_PED:   { label: 'Ready Lane',    icon: '✅', sublabel: 'Tarjeta RFID requerida' },
}

export default function LaneRow({ laneType, estimatedWait, status }: LaneRowProps) {
  const pill   = pillStyles[status] ?? pillStyles.UNKNOWN
  const config = laneConfig[laneType] ?? { label: laneType, icon: '🔲', sublabel: '' }

  return (
    <div className="flex items-center justify-between py-3 px-4 gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-lg leading-none flex-shrink-0">{config.icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 leading-tight">{config.label}</p>
          {config.sublabel && (
            <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{config.sublabel}</p>
          )}
        </div>
      </div>
      <span className={`text-sm font-bold rounded-full px-3 py-1 tabular-nums flex-shrink-0 ${pill}`}>
        {estimatedWait != null ? `${estimatedWait} min` : '—'}
      </span>
    </div>
  )
}