import { useDashboardState, useDashboardStats } from '@/hooks/useDashboardState'
import { DashboardHeader } from '@/views/dashboard/DashboardHeader'
import { DashboardLayout } from '@/views/dashboard/DashboardLayout'
import { QueuePanel } from '@/views/dashboard/QueuePanel'
import { DetailPanel } from '@/views/dashboard/DetailPanel'

export function DashboardPage() {
  const [state, actions] = useDashboardState()
  const stats = useDashboardStats(state.allQueue)

  const selectedPatient =
    state.allQueue.find(p => p.patientId === state.selectedPatientId) ?? null

  return (
    <div className="dashboard-mode h-screen flex flex-col bg-mistral-dark overflow-hidden">
      <DashboardHeader stats={stats} />
      <DashboardLayout
        left={
          <QueuePanel
            queue={state.queue}
            allQueue={state.allQueue}
            selectedId={state.selectedPatientId}
            filter={state.filter}
            onSelectPatient={actions.selectPatient}
            onFilterChange={actions.setFilter}
          />
        }
        right={
          <DetailPanel
            patient={selectedPatient}
            onAssignZone={actions.assignZone}
          />
        }
      />
    </div>
  )
}
