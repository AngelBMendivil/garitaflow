import LaneRow from './LaneRow'
import ConfidenceBar from './ConfidenceBar'

type LaneData = {
  laneType: string
  mode: 'VEHICULAR' | 'PEDESTRIAN'
  estimatedWait: number | null
  cbpWait: number | null
  historicalAvg: number | null
  confidence: number
  status: string
}

type PortCardProps = {
  portName: string
  lanes: LaneData[]
}

function accentColor(lanes: LaneData[]): string {
  const statuses = lanes.map((l) => l.status)
  if (statuses.includes('RED'))    return 'bg-rose-400'
  if (statuses.includes('YELLOW')) return 'bg-amber-400'
  if (statuses.includes('GREEN'))  return 'bg-emerald-400'
  return 'bg-gray-200'
}

function worstStatus(lanes: LaneData[]): string {
  if (lanes.some(l => l.status === 'RED'))    return 'text-rose-600'
  if (lanes.some(l => l.status === 'YELLOW')) return 'text-amber-600'
  if (lanes.some(l => l.status === 'GREEN'))  return 'text-emerald-600'
  return 'text-gray-400'
}

export default function PortCard({ portName, lanes }: PortCardProps) {
  const vehicular  = lanes.filter((l) => l.mode === 'VEHICULAR')
  const pedestrian = lanes.filter((l) => l.mode === 'PEDESTRIAN')
  const avgConfidence =
    lanes.length > 0
      ? Math.round(lanes.reduce((s, l) => s + l.confidence, 0) / lanes.length)
      : 0
  const accent = accentColor(lanes)
  const statusColor = worstStatus(lanes)

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      {/* Banda de color */}
      <div className={`h-1 w-full ${accent}`} />

      {/* Header de la garita */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">🌉 {portName}</h2>
          <p className="text-[10px] text-gray-400 mt-0.5">Frontera Tijuana – San Diego</p>
        </div>
        <span className={`text-xs font-semibold ${statusColor}`}>
          {lanes.some(l => l.status === 'RED') ? '🔴 Alta espera' :
           lanes.some(l => l.status === 'YELLOW') ? '🟡 Espera moderada' :
           lanes.some(l => l.status === 'GREEN') ? '🟢 Flujo normal' : '⚪ Sin datos'}
        </span>
      </div>

      <div className="border-t border-gray-50" />

      {/* Vehicular */}
      {vehicular.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
            <span className="text-sm">🚗</span>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Vehicular</p>
          </div>
          <div className="divide-y divide-gray-50">
            {vehicular.map((lane) => (
              <LaneRow
                key={lane.laneType}
                laneType={lane.laneType}
                estimatedWait={lane.estimatedWait}
                status={lane.status as 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'}
              />
            ))}
          </div>
        </section>
      )}

      {/* Peatonal */}
      {pedestrian.length > 0 && (
        <section className="border-t border-gray-100 mt-1">
          <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
            <span className="text-sm">🚶</span>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Peatonal</p>
          </div>
          <div className="divide-y divide-gray-50">
            {pedestrian.map((lane) => (
              <LaneRow
                key={lane.laneType}
                laneType={lane.laneType + '_PED'}
                estimatedWait={lane.estimatedWait}
                status={lane.status as 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'}
              />
            ))}
          </div>
        </section>
      )}

      {/* Disclaimer + confianza */}
      <div className="px-4 pb-3 pt-3 border-t border-gray-50 mt-1">
        <ConfidenceBar value={avgConfidence} />
        <p className="text-[10px] text-gray-400 mt-2 text-center">
          ⏱ Tiempos aproximados · Actualizado cada 5 min · Fuente: CBP.gov
        </p>
      </div>
    </div>
  )
}