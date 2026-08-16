type RecommendationProps = {
  text: string
  isSimilar: boolean
}

export default function Recommendation({ text, isSimilar }: RecommendationProps) {
  if (!text) return null

  const style = isSimilar
    ? 'bg-blue-50 border-blue-100 text-blue-800'
    : 'bg-emerald-50 border-emerald-100 text-emerald-800'

  const icon = isSimilar ? '💡' : '✅'

  return (
    <div className={`mx-3 mt-3 rounded-xl border px-4 py-3 flex gap-2 items-start ${style}`}>
      <span className="text-base leading-none mt-0.5" aria-hidden="true">{icon}</span>
      <p className="text-sm font-medium leading-snug">{text}</p>
    </div>
  )
}