'use client'
import { useState } from 'react'
import { Clock, X } from 'lucide-react'

export default function ScheduleButton({ schedule }: { schedule: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[10px] font-semibold text-surface-muted hover:text-brand-blue transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
      >
        <Clock size={11}/>
        Horario
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 max-w-xs w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-brand-blue"/>
                <span className="text-[13px] font-bold text-brand-navy">Horario de operación</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-surface-muted hover:text-brand-navy p-1">
                <X size={15}/>
              </button>
            </div>
            <p className="text-[24px] font-bold text-brand-navy leading-tight">{schedule}</p>
            <p className="text-[11px] text-surface-muted mt-3">Fuente: CBP.gov · Sujeto a cambios sin previo aviso</p>
          </div>
        </div>
      )}
    </>
  )
}