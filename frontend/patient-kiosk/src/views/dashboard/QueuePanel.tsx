import type { NurseQueueItem } from '@/types/dashboard'
import type { QueueFilter } from '@/hooks/useDashboardState'
import { QueueFilters } from './QueueFilters'
import { PatientQueueCard } from './PatientQueueCard'

interface QueuePanelProps {
  queue: NurseQueueItem[]
  allQueue: NurseQueueItem[]
  selectedId: string | null
  filter: QueueFilter
  onSelectPatient: (id: string | null) => void
  onFilterChange: (f: QueueFilter) => void
}

export function QueuePanel({
  queue,
  allQueue,
  selectedId,
  filter,
  onSelectPatient,
  onFilterChange,
}: QueuePanelProps) {
  const counts = {
    all: allQueue.length,
    waiting: allQueue.filter(p => p.status === 'waiting').length,
    called: allQueue.filter(p => p.status === 'called' || p.status === 'in_triage').length,
    oriented: allQueue.filter(p => p.assignedZone !== 'attente').length,
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pb-3">
        <QueueFilters current={filter} onChange={onFilterChange} counts={counts} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-4 scrollbar-thin">
        {queue.length === 0 ? (
          <div className="text-center text-slate-500 py-8 text-sm">
            No patients in this category
          </div>
        ) : (
          queue.map(item => (
            <PatientQueueCard
              key={item.patientId}
              item={item}
              isSelected={selectedId === item.patientId}
              onSelect={() =>
                onSelectPatient(selectedId === item.patientId ? null : item.patientId)
              }
            />
          ))
        )}
      </div>
    </div>
  )
}
