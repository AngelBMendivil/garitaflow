'use client'
import { useEffect, useRef, useState } from 'react'
import { TrendingUp } from 'lucide-react'

interface HourPoint { hour: number; avg: number | null; today: number | null }
interface ChartData  { general: HourPoint[]; sentri: HourPoint[] }
interface Tooltip    { x: number; y: number; hour: number; avg: number | null; today: number | null }

const PERIODS = [
  { label: 'Madrugada', start: 0,  end: 5  },
  { label: 'Mañana',    start: 6,  end: 11 },
  { label: 'Tarde',     start: 12, end: 17 },
  { label: 'Noche',     start: 18, end: 23 },
]
const PERIOD_FILL = ['#e0e7ff33','#fef9c333','#ffedd533','#f1f5f933']

function fmt(h: number): string {
  if (h === 0)  return '12am'
  if (h < 12)   return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

function nowHourLA(): number {
  return parseInt(
    new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      hour12: false,
    })
  )
}

export default function WaitTimeChart({ portCode }: { portCode: string }) {
  const [data,    setData]    = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lane,    setLane]    = useState<'general' | 'sentri'>('general')
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/chart?portCode=${portCode}`)
      .then(r => r.json())
      .then(d  => { setData(d); setLoading(false) })
      .catch(()  => setLoading(false))
  }, [portCode])

  if (loading) return (
    <div className="bg-white rounded-xl shadow-card border border-surface-border flex items-center justify-center h-48">
      <p className="text-[12px] text-surface-muted">Cargando historial...</p>
    </div>
  )

  if (!data) return null

  const points  = data[lane]
  const nowHour = nowHourLA()

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

  const W=620, H=200, pL=34, pR=6, pT=10, pB=30
  const cW=W-pL-pR, cH=H-pT-pB
  const sW=cW/24, bW=Math.max(6, sW-3)

  const cx  = (i: number) => pL + i*sW + sW/2
  const yS  = (v: number) => pT + cH - (v/chartMax)*cH
  const bX  = (i: number) => pL + i*sW + (sW-bW)/2

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
    const y = clientY - rect.top  - 65
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

      {/* Tabs */}
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
          { bg: '#60a5fa', label: 'Promedio 30 días' },
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
      <div
        ref={wrapRef}
        className="px-4 pb-3 relative"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-10 pointer-events-none"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <div className="bg-[#1e293b] text-white rounded-lg px-3 py-2 text-[11px] whitespace-nowrap shadow-xl">
              <p className="text-[10px] text-slate-400 mb-0.5">{fmt(tooltip.hour)}</p>
              <p className="font-medium">📊 Promedio: {tooltip.avg} min</p>
              {tooltip.today !== null && (
                <p className="text-orange-400 font-medium">🟠 Hoy: {tooltip.today} min</p>
              )}
            </div>
          </div>
        )}

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">

          {/* Period backgrounds */}
          {PERIODS.map((p, pi) => (
            <g key={p.label}>
              <rect x={pL+p.start*sW} y={pT} width={(p.end-p.start+1)*sW} height={cH} fill={PERIOD_FILL[pi]}/>
              <text x={pL+p.start*sW+(p.end-p.start+1)*sW/2} y={pT+10} textAnchor="middle" fontSize={7.5} fill="#94a3b8">{p.label}</text>
            </g>
          ))}

          {/* Grid */}
          {[0,1,2,3,4].map(g => {
            const yv=(chartMax/4)*g, yp=yS(yv)
            return (
              <g key={g}>
                <line x1={pL} y1={yp} x2={W-pR} y2={yp} stroke="#e2e8f0" strokeWidth={0.5}/>
                {g>0 && <text x={pL-3} y={yp+3} textAnchor="end" fontSize={8} fill="#94a3b8">{Math.round(yv)}</text>}
              </g>
            )
          })}

          {/* Bars + hit areas */}
          {points.map((p, i) => {
            if (p.avg === null) return null
            const barH=(p.avg/chartMax)*cH, y=yS(p.avg)
            const fill = i===maxH ? '#f87171' : i===minH ? '#4ade80' : '#60a5fa'
            return (
              <g key={i}>
                <rect x={bX(i)} y={y} width={bW} height={barH} fill={fill} rx={2} opacity={0.9}/>
                <rect
                  x={pL+i*sW} y={pT} width={sW} height={cH}
                  fill="transparent"
                  style={{ cursor:'pointer' }}
                  onMouseEnter={e => handleEnter(e, i)}
                  onMouseMove={e  => handleEnter(e, i)}
                  onTouchStart={e => { e.preventDefault(); handleEnter(e, i) }}
                  onTouchEnd={()  => setTimeout(() => setTooltip(null), 1500)}
                />
              </g>
            )
          })}

          {/* Today line */}
          {todayPath && (
            <path d={todayPath} stroke="#f97316" strokeWidth={2.5} fill="none"
              strokeLinejoin="round" strokeLinecap="round" pointerEvents="none"/>
          )}
          {todayPts.map(p => (
            <circle key={p.i} cx={p.x} cy={p.y}
              r={p.i===nowHour ? 5 : 3}
              fill="#f97316" stroke="#fff"
              strokeWidth={p.i===nowHour ? 2 : 1}
              pointerEvents="none"
            />
          ))}

          {/* "Ahora" label on last today point */}
          {todayPts.length > 0 && (() => {
            const last = todayPts[todayPts.length-1]
            const lw=60, lx = last.x+8+lw > W-pR ? last.x-lw-8 : last.x+8
            return (
              <g pointerEvents="none">
                <rect x={lx} y={last.y-10} width={lw} height={16} fill="#fff7ed" rx={4} stroke="#fed7aa" strokeWidth={0.5}/>
                <text x={lx+lw/2} y={last.y+1} textAnchor="middle" fontSize={8.5} fill="#c2410c" fontWeight={500}>
                  Ahora: {last.v} min
                </text>
              </g>
            )
          })()}

          {/* Callout: peor hora */}
          {(() => {
            const bx=cx(maxH), by=yS(maxVal)
            return (
              <g pointerEvents="none">
                <line x1={bx} y1={by-2} x2={bx} y2={by-14} stroke="#dc2626" strokeWidth={1}/>
                <rect x={bx-24} y={by-27} width={48} height={13} fill="#fef2f2" rx={3} stroke="#fca5a5" strokeWidth={0.5}/>
                <text x={bx} y={by-17} textAnchor="middle" fontSize={8.5} fill="#dc2626" fontWeight={500}>🔴 {maxVal} min</text>
              </g>
            )
          })()}

          {/* Callout: mejor hora */}
          {(() => {
            const bx=cx(minH), by=yS(minVal)
            return (
              <g pointerEvents="none">
                <line x1={bx} y1={by-2} x2={bx} y2={by-14} stroke="#16a34a" strokeWidth={1}/>
                <rect x={bx-24} y={by-27} width={48} height={13} fill="#f0fdf4" rx={3} stroke="#86efac" strokeWidth={0.5}/>
                <text x={bx} y={by-17} textAnchor="middle" fontSize={8.5} fill="#16a34a" fontWeight={500}>✅ {minVal} min</text>
              </g>
            )
          })()}

          {/* Línea vertical ahora */}
          <line x1={cx(nowHour)} y1={pT} x2={cx(nowHour)} y2={pT+cH}
            stroke="#6366f1" strokeWidth={1} strokeDasharray="4 2" pointerEvents="none"/>

          {/* Eje X */}
          {Array.from({length:24},(_,i)=>i).filter(i=>i%3===0).map(i=>(
            <text key={i} x={cx(i)} y={H-8} textAnchor="middle" fontSize={8.5} fill="#94a3b8">{fmt(i)}</text>
          ))}

        </svg>
      </div>

      {/* Insight */}
      <div className="mx-4 mb-3 px-3 py-2 bg-surface-bg rounded-lg border border-surface-border">
        <p className="text-[11px] text-surface-muted leading-relaxed">
          💡 Toca o pasa el cursor sobre cualquier barra para ver el detalle. La línea naranja muestra cómo ha estado la fila hoy vs el promedio histórico.
        </p>
      </div>

    </div>
  )
}
