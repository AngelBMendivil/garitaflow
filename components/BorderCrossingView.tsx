'use client'
import { useState } from 'react'
import CrossingSummaryCard from '@/components/CrossingSummaryCard'
import LaneSection from '@/components/LaneSection'
import RecommendationCard from '@/components/RecommendationCard'
import ConfidenceCard from '@/components/ConfidenceCard'
import AdBanner from '@/components/AdBanner'
import type { BorderCrossing } from '@/lib/types'

interface Props { crossings: BorderCrossing[] }

const SCHEDULES: Record<string, string> = {
  'SAN_YSIDRO-vehicle':    '24 hrs / 7 días',
  'SAN_YSIDRO-pedestrian': '24 hrs / 7 días',
  'SAN_YSIDRO-pedwest':    '6:00 a.m. – 2:00 p.m.',
  'OTAY-vehicle':          '24 hrs / 7 días',
  'OTAY-pedestrian':       '24 hrs / 7 días',
}

export default function BorderCrossingView({ crossings }: Props) {
  const [selected, setSelected] = useState(0)
  const crossing = crossings[selected]

  if (!crossing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-bg border border-surface-border flex items-center justify-center mb-4">
          <svg width="28" height="22" viewBox="0 0 26 20" fill="none" aria-hidden="true">
            <rect x="0" y="0" width="7" height="3.5" rx="1.75" fill="#A6B0C3"/>
            <rect x="0" y="8" width="13" height="3.5" rx="1.75" fill="#A6B0C3"/>
            <rect x="0" y="16" width="19" height="3.5" rx="1.75" fill="#A6B0C3"/>
            <line x1="9" y1="0" x2="26" y2="20" stroke="#A6B0C3" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-[15px] font-semibold text-brand-navy mb-1">Sin datos disponibles</p>
        <p className="text-[13px] text-surface-muted">
          Ejecuta <code className="bg-surface-bg px-1.5 py-0.5 rounded font-mono text-[12px]">npm run scrape</code> para cargar datos
        </p>
      </div>
    )
  }

  const vehicular = crossing.lanes.filter(l => l.category === 'vehicle')

  // Peatonal: solo carril General, renombrado como "General / Ready Lane"
  const pedestrian = crossing.lanes
    .filter(l => l.category === 'pedestrian' && l.name === 'General')
    .map(l => ({ ...l, name: 'General / Ready Lane' }))

  // PedWest: solo carril General, renombrado como "General / Ready Lane"
  const pedwest = crossing.lanes
    .filter(l => l.category === 'pedwest' && l.name === 'General')
    .map(l => ({ ...l, name: 'General / Ready Lane' }))

  return (
    <>
      {/* Tabs */}
      <div className="bg-white border-b border-surface-border px-4 pt-3 flex gap-2">
        {crossings.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setSelected(i)}
            className={`flex-1 py-2 text-[13px] font-semibold rounded-t-lg border transition-all ${
              i === selected
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-white text-surface-muted border-surface-border hover:border-brand-blue hover:text-brand-blue'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 py-4 flex flex-col gap-4">
        <CrossingSummaryCard crossing={crossing}/>
        <AdBanner variant="banner"/>
        <LaneSection
          category="vehicle"
          lanes={vehicular}
          schedule={SCHEDULES[`${crossing.portCode}-vehicle`]}
        />
        <LaneSection
          category="pedestrian"
          lanes={pedestrian}
          schedule={SCHEDULES[`${crossing.portCode}-pedestrian`]}
        />
        {pedwest.length > 0 && (
          <LaneSection
            category="pedwest"
            lanes={pedwest}
            schedule={SCHEDULES[`${crossing.portCode}-pedwest`]}
          />
        )}
        <RecommendationCard crossing={crossing}/>
        <ConfidenceCard crossing={crossing}/>
        <AdBanner variant="rectangle"/>
      </div>
    </>
  )
}
