import { Clock, User } from 'lucide-react'
import type { NurseQueueItem } from '@/types/dashboard'
import { CcmuBadge } from '@/components/CcmuBadge'
import { WaitTimer } from '@/components/WaitTimer'

interface PatientDetailHeaderProps {
  item: NurseQueueItem
}

function computeAge(dob: string): number {
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    age--
  }
  return age
}

export function PatientDetailHeader({ item }: PatientDetailHeaderProps) {
  const identity = item.patientData.identity
  const age = identity?.dateOfBirth ? computeAge(identity.dateOfBirth) : null
  const gender = identity?.gender === 'M' ? 'Homme' : identity?.gender === 'F' ? 'Femme' : 'Autre'

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold">{item.patientName}</h2>
        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
          <span className="flex items-center gap-1">
            <User size={14} />
            {age !== null ? `${age} ans` : '?'} — {gender}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} />
            Attente : <WaitTimer arrivalTime={item.arrivalTime} className="font-medium text-white" />
          </span>
        </div>
      </div>
      <CcmuBadge level={item.ccmuLevel} />
    </div>
  )
}
