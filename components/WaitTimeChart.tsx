'use client'
import { useEffect, useRef, useState } from 'react'
import { TrendingUp } from 'lucide-react'

interface HourPoint { hour: number; avg: number | null; today: number | null }
interface ChartData  { general: HourPoint[]; sentri: HourPoint[] }
interface Tooltip    { x: number; y: number; hour: number; avg: number | null; today: number | null }

const DAY_NAMES = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados']

function fmt(h: number): string {
  if (h === 0)  return '12am'
  if (h < 12)   return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

function nowHourInTz(tz: string): number {
  return parseInt(
    new Date().toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false })
  )
}

function nowDowInTz(tz: string): number {
  const local = new Date(new Date().toLocaleString('en-US', { timeZone: tz }))
  return local.getDay()
}

interface Props {
  portCode: string
  timezone?: string
}

export default function WaitTimeChart({ portCode, timezone = 'America/Los_Angeles' }: Props) {
  const [data,    setData]    = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lane,    setLane]    = useState<'general' | 'sentri'>('general')
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const dow     = nowDowInTz(timezone)
  const nowHour = nowHourInTz(timezone)
  const dayName = DAY_NAMES[dow] ?? 'hoy'

  useEffect(() => {
    setLoading(true)
    setData(null)
    fetch(`/api/chart?portCode=${portCode}&dow=${dow}&timezone=${encodeURIComponent(timezone)}`)
      .then(r => r.json())
      .then(d  => { setData(d); setLoading(false) })
      .catch(()  => setLoading(false))
  }, [portCode, timezone, dow])

  if (loading) return (
    <div className="bg-white rounded-xl shadow-card border border-surface-border flex items-center justify-center h-48">
      <p className="text-[12px] text-surface-muted">Cargando historial...</p>
    </div>
  )

  if (!data) return null

  const points = data[lane]
  if (!points || !Array.isArray(points)) return null

  const avgVals = points.map(p => p.avg).filter((v): v is number => v !== null)
  if (!avgVals.length) return (
    <div className="bg-white rounded-xl shadow-card border border-surface-border flex items-center justify-center h-48">
      <p className="text-[12px] text-surface-muted text-center px-6">Sin historial suficiente aún — regresa en unos días</p>
    </div>
  )

  const maxVal = Math.max(...avgVals)
  const minVal = Math.min(...avgVals)
  const maxH   = points.findIndex(p => p.avg === maxVal)
  const minH   = points.findIndex(p => p.avg === minVal)
  const allVals = [...avgVals, ...points.map(p => p.today).filter((v): v is number => v !== null)]
  const chartMax = Math.ceil(Math.max(...allVals) / 20) * 20 + 15

  const W=620, H=240, pL=36, pR=8, pT=16, pB=32
  const cW=W-pL-pR, cH=H-pT-pB
  const sW=cW/24, bW=Math.max(8, sW-4)

  const cx = (i: number) => pL + i*sW + sW/2
  const yS = (v: number) => pT + cH - (v/chartMax)*cH
  const bX = (i: number) => pL + i*sW + (sW-bW)/2

  const todayPts = points
    .map((p, i) => p.today !== null ? { x: cx(i), y: yS(p.today), v: p.today, i } : null)
    .filter((p): p is NonNullable<typeof p> => p !== null)

  const todayPath = todayPts.map((p, idx) => `${idx===0?'M':'L'}${p.x},${p.y}`).join(' ')

  function handleEnter(e: React.MouseEvent | React.TouchEvent, i: number) {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? 0) : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? (e.touches[0]?.clientY ?? 0) : (e as React.MouseEvent).clientY
    let x = clientX - rect.left + 10
    const y = clientY - rect.top - 65
    if (x + 160 > rect.width) x -= 170
    setTooltip({ x, y: Math.max(y, 8), hour: i, avg: points[i]?.avg ?? null, today: points[i]?.today ?? null })
  }

  const nowVal = points[nowHour]?.today ?? points[nowHour]?.avg ?? null

  return (
    <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-border bg-surface-bg">
        <TrendingUp size={14} className="text-surface-muted" aria-hidden="true"/>
        <span className="text-[11px] font-bold text-surface-muted uppercase tracking-widest">
          Espera por hora · Vehicular
        </span>
      </div>

      {/* Tabs General / SENTRI */}
      <div className="flex gap-1.5 px-4 pt-3">
        {(['general', 'sentri'] as const).map(l => (
          <button
            key={l}
            onClick={() => { setLane(l); setTooltip(null) }}
            className={`text-[12px] font-semibold px-4 py-1.5 rounded-t-lg border transition-all ${
              lane === l
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-white text-surface-muted border-surface-border hover:border-brand-blue hover:text-brand-blue'
            }`}
          >
            {l === 'general' ? 'General' : 'SENTRI'}
          </button>
        ))}
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3">
        <div className="bg-green-50 rounded-xl p-2.5">
          <p className="text-[9px] font-bold text-green-800 uppercase tracking-wide">✅ Mejor hora</p>
          <p className="text-[15px] font-semibold text-green-800">{fmt(minH)}</p>
          <p className="text-[10px] text-green-500">{minVal} min de espera</p>
        </div>
        <div className="bg-red-50 rounded-xl p-2.5">
          <p className="text-[9px] font-bold text-red-800 uppercase tracking-wide">🔴 Peor hora</p>
          <p className="text-[15px] font-semibold text-red-800">{fmt(maxH)}</p>
          <p className="text-[10px] text-red-400">{maxVal} min de espera</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-2.5">
          <p className="text-[9px] font-bold text-blue-800 uppercase tracking-wide">🕐 Ahora</p>
          <p className="text-[15px] font-semibold text-blue-800">{fmt(nowHour)}</p>
          <p className="text-[10px] text-blue-400">{nowVal != null ? `${nowVal} min` : '—'}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 px-4 pb-1 flex-wrap">
        {[
          { bg: '#60a5fa', label: `Promedio ${dayName}` },
          { bg: '#4ade80', label: 'Mejor hora' },
          { bg: '#f87171', label: 'Peor hora' },
        ].map(({ bg, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div style={{ width:8, height:8, background:bg, borderRadius:2 }}/>
            <span className="text-[9px] text-surface-muted">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div style={{ width:14, height:2, background:'#f97316', borderRadius:1 }}/>
          <span className="text-[9px] text-surface-muted">Tendencia hoy</span>
        </div>
      </div>

      {/* Chart */}
      <div ref={wrapRef} className="px-4 pb-3 relative" onMouseLeave={() => setTooltip(null)}>
        {tooltip && (
          <div className="absolute z-10 pointer-events-none" style={{ left: tooltip.x, top: tooltip.y }}>
            <div className="bg-[#1e293b] text-white rounded-lg px-3 py-2 text-[11px] whitespace-nowrap shadow-xl">
              <p className="text-[10px] text-slate-400 mb-0.5">{fmt(tooltip.hour)}</p>
              <p className="font-medium">📊 Promedio {dayName}: {tooltip.avg} min</p>
              {tooltip.today !== null && (
                <p className="text-orange-400 font-medium">🟠 Hoy: {tooltip.today} min</p>
              )}
            </div>
          </div>
        )}

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          {[0,1,2,3,4].map(g => {
            const yv=(chartMax/4)*g, yp=yS(yv)
            return (
              <g key={g}>
                <line x1={pL} y1={yp} x2={W-pR} y2={yp} stroke="#e2e8f0" strokeWidth={0.5}/>
                {g>0 && <text x={pL-4} y={yp+3} textAnchor="end" fontSize={9} fill="#94a3b8">{Math.round(yv)}</text>}
              </g>
            )
          })}

          <line x1={cx(nowHour)} y1={pT} x2={cx(nowHour)} y2={pT+cH}
            stroke="#6366f1" strokeWidth={1} strokeDasharray="4 2" pointerEvents="none"/>

          {points.map((p, i) => {
            if (p.avg === null) return null
            const barH=(p.avg/chartMax)*cH, y=yS(p.avg)
            const fill = i===maxH ? '#f87171' : i===minH ? '#4ade80' : '#60a5fa'
            return (
              <g key={i}>
                <rect x={bX(i)} y={y} width={bW} height={barH} fill={fill} rx={2} opacity={0.9}/>
                <rect x={pL+i*sW} y={pT} width={sW} height={cH} fill="transparent"
                  style={{ cursor:'pointer' }}
                  onMouseEnter={e => handleEnter(e, i)}
                  onMouseMove={e  => handleEnter(e, i)}
                  onTouchStart={e => { e.preventDefault(); handleEnter(e, i) }}
                  onTouchEnd={()  => setTimeout(() => setTooltip(null), 1500)}
                />
              </g>
            )
          })}

          {todayPath && (
            <path d={todayPath} stroke="#f97316" strokeWidth={3} fill="none"
              strokeLinejoin="round" strokeLinecap="round" pointerEvents="none"/>
          )}
          {todayPts.map(p => (
            <circle key={p.i} cx={p.x} cy={p.y}
              r={p.i===nowHour ? 6 : 3} fill="#f97316" stroke="#fff"
              strokeWidth={p.i===nowHour ? 2.5 : 1} pointerEvents="none"/>
          ))}

          {todayPts.length > 0 && (() => {
            const last = todayPts[todayPts.length-1]
            if (!last) return null
            const lw=64, lx = last.x+10+lw > W-pR ? last.x-lw-10 : last.x+10
            return (
              <g pointerEvents="none">
                <rect x={lx} y={last.y-11} width={lw} height={18} fill="#fff7ed" rx={9} stroke="#fed7aa" strokeWidth={0.5}/>
                <text x={lx+lw/2} y={last.y+2} textAnchor="middle" fontSize={9} fill="#c2410c" fontWeight={500}>
                  Ahora: {last.v} min
                </text>
              </g>
            )
          })()}

          {[0, 6, 12, 18, 23].map(i => (
            <text key={i} x={cx(i)} y={H-8} textAnchor="middle" fontSize={10} fill="#94a3b8">{fmt(i)}</text>
          ))}
        </svg>
      </div>

      <div className="mx-4 mb-3 px-3 py-2 bg-surface-bg rounded-lg border border-surface-border">
        <p className="text-[11px] text-surface-muted leading-relaxed">
          💡 Las barras muestran el promedio histórico de los {dayName}. La línea naranja es la tendencia de hoy.
        </p>
      </div>

    </div>
  )
}
