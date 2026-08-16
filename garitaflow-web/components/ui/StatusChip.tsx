import type { WaitStatus } from '@/lib/types'

const cfg: Record<WaitStatus, { label: string; cls: string }> = {
  fast:     { label: 'Rápido',   cls: 'bg-green-50 text-green-700 border-green-200' },
  moderate: { label: 'Moderado', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  high:     { label: 'Alto',     cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  critical: { label: 'Crítico',  cls: 'bg-red-50 text-red-700 border-red-200' },
}

export default function StatusChip({ status, size = 'sm' }: { status: WaitStatus; size?: 'xs' | 'sm' }) {
  const { label, cls } = cfg[status]
  const sz = size === 'xs' ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-0.5'
  return (
    <span className={`inline-flex items-center font-semibold rounded-full border ${sz} ${cls}`}>
      {label}
    </span>
  )
}