function rel(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (d < 1) return "hace menos de un minuto"; if (d < 60) return `hace ${d} min`
  const h = Math.floor(d / 60); return h < 24 ? `hace ${h} h` : `hace mas de ${Math.floor(h/24)} dias`
}
export default function LastUpdated({ updatedAt, stale }: { updatedAt: string | null; stale: boolean }) {
  return (
    <div className="text-center py-4 px-4 space-y-1">
      {updatedAt ? <p className="text-xs text-gray-500">Actualizado {rel(updatedAt)}</p> : <p className="text-xs text-gray-400">Sin datos recientes</p>}
      {stale && <p className="text-xs text-amber-600 font-medium">Datos con mas de 2 horas de antiguedad</p>}
      <p className="text-xs text-gray-400">Estimacion no oficial · Datos: CBP bwt.cbp.gov</p>
    </div>
  )
}
