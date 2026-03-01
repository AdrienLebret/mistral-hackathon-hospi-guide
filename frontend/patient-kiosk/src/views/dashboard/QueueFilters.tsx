import { cn } from '@/lib/utils'
import type { QueueFilter } from '@/hooks/useDashboardState'

interface QueueFiltersProps {
  current: QueueFilter
  onChange: (f: QueueFilter) => void
  counts: { all: number; waiting: number; called: number; oriented: number }
}

const FILTERS: { key: QueueFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'called', label: 'Called' },
  { key: 'oriented', label: 'Oriented' },
]

export function QueueFilters({ current, onChange, counts }: QueueFiltersProps) {
  return (
    <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl">
      {FILTERS.map(f => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={cn(
            'flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            current === f.key
              ? 'bg-mistral-orange text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700',
          )}
        >
          {f.label} ({counts[f.key]})
        </button>
      ))}
    </div>
  )
}
