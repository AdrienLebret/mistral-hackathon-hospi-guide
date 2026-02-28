import { Info, AlertTriangle, AlertOctagon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AIInsight } from '@/types/dashboard'

const SEVERITY_CONFIG: Record<string, { border: string; icon: typeof Info; iconColor: string; bg: string }> = {
  info: { border: 'border-l-blue-500', icon: Info, iconColor: 'text-blue-400', bg: 'bg-blue-950/30' },
  warning: { border: 'border-l-amber-500', icon: AlertTriangle, iconColor: 'text-amber-400', bg: 'bg-amber-950/30' },
  critical: { border: 'border-l-red-500', icon: AlertOctagon, iconColor: 'text-red-400', bg: 'bg-red-950/30' },
}

interface InsightCardProps {
  insight: AIInsight
}

export function InsightCard({ insight }: InsightCardProps) {
  const config = SEVERITY_CONFIG[insight.severity] ?? SEVERITY_CONFIG.info
  const Icon = config.icon

  return (
    <div
      className={cn(
        'rounded-lg border-l-4 p-3',
        config.border,
        config.bg,
        insight.severity === 'critical' && 'animate-pulse',
      )}
    >
      <div className="flex items-start gap-2">
        <Icon size={16} className={cn('mt-0.5 shrink-0', config.iconColor)} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{insight.title}</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{insight.description}</p>

          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-slate-500">{insight.source}</span>
            <div className="flex items-center gap-1.5">
              <div className="w-12 h-1 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={cn('h-full rounded-full', config.iconColor.replace('text-', 'bg-'))}
                  style={{ width: `${insight.confidence * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500">{Math.round(insight.confidence * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
