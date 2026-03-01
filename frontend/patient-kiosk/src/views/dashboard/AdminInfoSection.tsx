import { useState } from 'react'
import { ChevronDown, ChevronRight, IdCard } from 'lucide-react'
import type { PatientIdentity } from '@/types/patient'

interface AdminInfoSectionProps {
  identity: Partial<PatientIdentity>
}

export function AdminInfoSection({ identity }: AdminInfoSectionProps) {
  const [open, setOpen] = useState(false)

  const rows = [
    { label: 'Phone', value: identity.phone },
    { label: 'Date of birth', value: identity.dateOfBirth },
    { label: 'Insurance', value: identity.insuranceType },
    { label: 'SSN', value: identity.insuranceNumber },
    { label: 'Supplemental', value: identity.mutuelle },
    { label: 'Emergency contact', value: identity.emergencyContactName },
    { label: 'Emergency phone', value: identity.emergencyContactPhone },
    { label: 'Relationship', value: identity.emergencyContactRelation },
    { label: 'Primary physician', value: identity.attendingPhysician },
  ].filter(r => r.value)

  if (rows.length === 0) return null

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
      >
        <IdCard size={14} />
        <span className="font-medium text-xs">Administrative information</span>
        {open ? <ChevronDown size={14} className="ml-auto" /> : <ChevronRight size={14} className="ml-auto" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {rows.map(r => (
            <div key={r.label} className="flex justify-between text-xs">
              <span className="text-slate-500">{r.label}</span>
              <span className="text-slate-300 text-right">{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
