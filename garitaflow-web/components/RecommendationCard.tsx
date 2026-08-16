import { Lightbulb } from 'lucide-react'
import type { BorderCrossing } from '@/lib/types'
import { getBestLane, getWorstLane } from '@/lib/types'

function buildRecommendation(crossing: BorderCrossing): string {
  const vehicles   = crossing.lanes.filter(l => l.category === 'vehicle')
  const pedestrians = crossing.lanes.filter(l => l.category === 'pedestrian')

  const bestVeh  = getBestLane(vehicles)
  const bestPed  = getBestLane(pedestrians)
  const worstVeh = getWorstLane(vehicles)

  const parts: string[] = []

  if (bestVeh) {
    if (bestVeh.status === 'fast') {
      parts.push(`Si tienes ${bestVeh.name}, cruza en vehículo — solo ${bestVeh.waitMinutes} min.`)
    } else {
      parts.push(`Mejor opción vehicular: ${bestVeh.name} con ${bestVeh.waitMinutes} min.`)
    }
  }

  if (bestPed && (bestPed.status === 'fast' || bestPed.status === 'moderate')) {
    if (bestPed.status === 'fast') {
      parts.push(`Si vas caminando, ${bestPed.name} tiene solo ${bestPed.waitMinutes} min — casi sin espera.`)
    } else {
      parts.push(`Peatonal ${bestPed.name}: ${bestPed.waitMinutes} min de espera moderada.`)
    }
  }

  if (worstVeh && (worstVeh.status === 'high' || worstVeh.status === 'critical')) {
    parts.push(`Evita ${worstVeh.name} vehicular: ${worstVeh.waitMinutes} min de espera ${worstVeh.status === 'critical' ? 'crítica' : 'alta'}.`)
  }

  return parts.join(' ') || 'Revisa los tiempos de cada carril para elegir la mejor opción.'
}

export default function RecommendationCard({ crossing }: { crossing: BorderCrossing }) {
  const text = buildRecommendation(crossing)
  return (
    <div className="bg-white rounded-xl shadow-card border border-blue-100 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb size={16} className="text-brand-blue" aria-hidden="true"/>
        <span className="text-[12px] font-bold text-brand-blue">Recomendación GaritaFlow</span>
      </div>
      <p className="text-[13px] text-slate-600 leading-relaxed">{text}</p>
    </div>
  )
}