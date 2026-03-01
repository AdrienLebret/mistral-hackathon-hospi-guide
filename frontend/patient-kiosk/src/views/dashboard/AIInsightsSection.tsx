import { Sparkles } from 'lucide-react'
import type { AIInsight } from '@/types/dashboard'
import { InsightCard } from './InsightCard'

interface AIInsightsSectionProps {
  insights: AIInsight[]
}

export function AIInsightsSection({ insights }: AIInsightsSectionProps) {
  if (insights.length === 0) return null

  const sorted = [...insights].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2)
  })

  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
        <Sparkles size={16} className="text-mistral-amber" />
        AI Suggestions
      </div>

      <div className="space-y-2">
        {sorted.map(insight => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>

      <p className="text-[10px] text-slate-600 italic mt-2 text-center">
        AI Suggestions — Decision support only. The nurse remains the sole decision-maker.
      </p>
    </div>
  )
}
