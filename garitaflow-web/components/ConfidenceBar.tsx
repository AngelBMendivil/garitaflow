export default function ConfidenceBar({ confidence }: { confidence: number }) {
  const bar = confidence > 70 ? "bg-green-400" : confidence > 40 ? "bg-yellow-400" : "bg-red-400"
  const label = confidence > 70 ? "Alta" : confidence > 40 ? "Media" : "Baja"
  return (
    <div className="px-3 pb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-400">Confianza: {label}</span>
        <span className="text-xs text-gray-400">{confidence}%</span>
      </div>
      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-1 rounded-full ${bar}`} style={{ width: `${confidence}%` }} />
      </div>
    </div>
  )
}
