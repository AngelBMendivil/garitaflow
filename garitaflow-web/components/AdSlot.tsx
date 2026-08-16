/**
 * AdSlot — Espacio reservado para publicidad
 * variant="banner"    → 320×50  (debajo del header, entre secciones)
 * variant="rectangle" → 320×100 (antes del footer)
 */
type AdSlotProps = {
  variant?: 'banner' | 'rectangle'
  label?: string
}

export default function AdSlot({
  variant = 'banner',
  label = 'Espacio publicitario',
}: AdSlotProps) {
  const height = variant === 'rectangle' ? 'h-24' : 'h-12'

  return (
    <div
      className={`w-full ${height} flex items-center justify-center bg-gray-50 border-y border-gray-100`}
      aria-hidden="true"
    >
      <span className="text-[10px] font-medium text-gray-300 uppercase tracking-widest">
        {label}
      </span>
    </div>
  )
}