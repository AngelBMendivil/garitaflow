'use client'
import { useEffect, useState } from 'react'
import CrossingSummaryCard from '@/components/CrossingSummaryCard'
import LaneSection from '@/components/LaneSection'
import WaitTimeChart from '@/components/WaitTimeChart'
import ConfidenceCard from '@/components/ConfidenceCard'
import AdBanner from '@/components/AdBanner'
import { CITIES, detectCityKey, getCityByKey } from '@/lib/cities'
import type { BorderCrossing } from '@/lib/types'

interface Props { crossings: BorderCrossing[] }

function isPedwestClosed(): boolean {
  const hour = parseInt(
    new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      hour12: false,
    })
  )
  return hour < 6 || hour >= 14
}

const SCHEDULES: Record<string, string> = {
  'SAN_YSIDRO-vehicle':
    'General / Ready Lane: 24 hrs / 7 días\nSENTRI (2da calle): 4:00 a.m. – 11:00 p.m.',
  'SAN_YSIDRO-pedestrian': '24 hrs / 7 días',
  'SAN_YSIDRO-pedwest':    '6:00 a.m. – 2:00 p.m.',
  'OTAY-vehicle':
    'General / Ready Lane: 24 hrs / 7 días\nSENTRI: Lun–Jue: 4:00 a.m. – 10:00 p.m.\nVie–Dom: 4:00 a.m. – 12:00 a.m.',
  'OTAY-pedestrian': '24 hrs / 7 días',
}

export default function BorderCrossingView({ crossings }: Props) {
  const [cityKey,   setCityKey]   = useState('tijuana')
  const [portIndex, setPortIndex] = useState(0)

  // Auto-detect city on mount (client-only)
  useEffect(() => {
    const detected = detectCityKey()
    setCityKey(detected)
    setPortIndex(0)
  }, [])

  const city         = getCityByKey(cityKey)
  const cityPortCodes = city.ports.map(p => p.code)

  // Find real crossing data for this city's ports
  const cityCrossings = city.ports.map(cp =>
    crossings.find(c => c.portCode === cp.code) ?? null
  )

  const selectedPort    = city.ports[portIndex]
  const crossing        = cityCrossings[portIndex] ?? null
  const pedwestClosed   = isPedwestClosed()

  function handleCityChange(key: string) {
    setCityKey(key)
    setPortIndex(0)
  }

  return (
    <>
      {/* ── Ciudad selector (scrollable tabs) ── */}
      <div className="bg-white border-b border-surface-border">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex px-3 pt-3 gap-1.5 min-w-max">
            {CITIES.map(c => (
              <button
                key={c.key}
                onClick={() => handleCityChange(c.key)}
                className={`flex flex-col items-center px-3.5 py-2 rounded-t-lg border text-left transition-all whitespace-nowrap ${
                  c.key === cityKey
                    ? 'bg-brand-blue text-white border-brand-blue'
                    : 'bg-white text-surface-muted border-surface-border hover:border-brand-blue hover:text-brand-blue'
                }`}
              >
                <span className="text-[13px] font-semibold leading-tight">{c.label}</span>
                <span className={`text-[9px] ${c.key === cityKey ? 'text-blue-200' : 'text-surface-muted'}`}>
                  {c.state}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Timezone badge */}
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-surface-bg border-t border-surface-border">
          <span className="text-[10px] text-surface-muted">🕐</span>
          <span className="text-[10px] text-surface-muted">{city.tzLabel}</span>
        </div>
      </div>

      {/* ── Puerto selector (tabs within city) ── */}
      {city.ports.length > 1 && (
        <div className="bg-white border-b border-surface-border px-4 pt-2 pb-0 flex gap-2">
          {city.ports.map((port, i) => (
            <button
              key={port.code}
              onClick={() => setPortIndex(i)}
              className={`flex-1 py-2 text-[12px] font-semibold rounded-t-lg border transition-all ${
                i === portIndex
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-surface-muted border-surface-border hover:border-indigo-400 hover:text-indigo-600'
              }`}
            >
              {port.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      <div className="px-4 py-4 flex flex-col gap-4">
        {crossing ? (
          <>
            <CrossingSummaryCard crossing={crossing} pedwestClosed={pedwestClosed}/>
            <AdBanner variant="banner"/>
            <LaneSection
              category="vehicle"
              lanes={crossing.lanes.filter(l => l.category === 'vehicle')}
              schedule={SCHEDULES[`${crossing.portCode}-vehicle`]}
            />
            <LaneSection
              category="pedestrian"
              lanes={crossing.lanes
                .filter(l => l.category === 'pedestrian' && l.name === 'General')
                .map(l => ({ ...l, name: 'General / Ready Lane' }))}
              schedule={SCHEDULES[`${crossing.portCode}-pedestrian`]}
            />
            {(crossing.lanes.some(l => l.category === 'pedwest') || crossing.portCode === 'SAN_YSIDRO') && (
              <LaneSection
                category="pedwest"
                lanes={crossing.lanes
                  .filter(l => l.category === 'pedwest' && l.name === 'General')
                  .map(l => ({ ...l, name: 'General / Ready Lane' }))}
                schedule={SCHEDULES[`${crossing.portCode}-pedwest`]}
                closed={crossing.portCode === 'SAN_YSIDRO' ? pedwestClosed : false}
              />
            )}
            <WaitTimeChart portCode={crossing.portCode} timezone={city.timezone}/>
            <ConfidenceCard crossing={crossing}/>
          </>
        ) : (
          /* No data yet for this port */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 text-2xl">
              🚧
            </div>
            <p className="text-[15px] font-semibold text-brand-navy mb-1">
              {selectedPort?.name} — Próximamente
            </p>
            <p className="text-[13px] text-surface-muted max-w-xs leading-relaxed">
              Estamos conectando esta garita. Los datos aparecerán en cuanto se complete la integración.
            </p>
          </div>
        )}

        <AdBanner variant="rectangle"/>
      </div>
    </>
  )
}
