import { useState, useMemo, useCallback } from 'react'
import type { NurseQueueItem, TriageZone, QueueStatus } from '@/types/dashboard'
import { CCMU_SORT_ORDER } from '@/data/triageZones'
import { generateMockQueue } from '@/data/mockDashboardData'

export type QueueFilter = 'all' | 'waiting' | 'called' | 'oriented'

export interface DashboardState {
  queue: NurseQueueItem[]
  allQueue: NurseQueueItem[]
  selectedPatientId: string | null
  filter: QueueFilter
}

export interface DashboardActions {
  selectPatient: (id: string | null) => void
  setFilter: (f: QueueFilter) => void
  assignZone: (patientId: string, zone: TriageZone) => void
  callPatient: (patientId: string) => void
}

function sortQueue(queue: NurseQueueItem[]): NurseQueueItem[] {
  return [...queue].sort((a, b) => {
    const oa = CCMU_SORT_ORDER[a.ccmuLevel] ?? 99
    const ob = CCMU_SORT_ORDER[b.ccmuLevel] ?? 99
    if (oa !== ob) return oa - ob
    return new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime()
  })
}

function matchesFilter(item: NurseQueueItem, filter: QueueFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'waiting':
      return item.status === 'waiting'
    case 'called':
      return item.status === 'called' || item.status === 'in_triage'
    case 'oriented':
      return item.assignedZone !== 'attente'
  }
}

export function useDashboardState(): [DashboardState, DashboardActions] {
  const [queue, setQueue] = useState<NurseQueueItem[]>(() => generateMockQueue())
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [filter, setFilter] = useState<QueueFilter>('all')

  const sortedQueue = useMemo(() => sortQueue(queue), [queue])

  const selectPatient = useCallback((id: string | null) => {
    setSelectedPatientId(id)
  }, [])

  const assignZone = useCallback((patientId: string, zone: TriageZone) => {
    setQueue(prev =>
      prev.map(p =>
        p.patientId === patientId
          ? { ...p, assignedZone: zone, status: 'called' as QueueStatus, calledTime: new Date().toISOString() }
          : p,
      ),
    )
  }, [])

  const callPatient = useCallback((patientId: string) => {
    setQueue(prev =>
      prev.map(p =>
        p.patientId === patientId
          ? { ...p, status: 'called' as QueueStatus, calledTime: new Date().toISOString() }
          : p,
      ),
    )
  }, [])

  const filteredQueue = useMemo(
    () => sortedQueue.filter(item => matchesFilter(item, filter)),
    [sortedQueue, filter],
  )

  const state: DashboardState = {
    queue: filteredQueue,
    allQueue: sortedQueue,
    selectedPatientId,
    filter,
  }

  const actions: DashboardActions = {
    selectPatient,
    setFilter,
    assignZone,
    callPatient,
  }

  return [state, actions]
}

export function useDashboardStats(queue: NurseQueueItem[]) {
  return useMemo(() => {
    const total = queue.length
    const critical = queue.filter(p => p.ccmuLevel === '4' || p.ccmuLevel === '5').length
    const waiting = queue.filter(p => p.status === 'waiting').length
    const oriented = queue.filter(p => p.assignedZone !== 'attente').length

    const avgWaitMs =
      queue.reduce((sum, p) => sum + (Date.now() - new Date(p.arrivalTime).getTime()), 0) /
      (queue.length || 1)
    const avgWaitMin = Math.round(avgWaitMs / 60_000)

    return { total, critical, waiting, oriented, avgWaitMin }
  }, [queue])
}
