import { motion } from 'framer-motion'
import { AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NurseQueueItem } from '@/types/dashboard'
import { CCMU_MAP } from '@/types/ccmu'
import { WaitTimer } from '@/components/WaitTimer'
import { ZoneBadge } from './ZoneBadge'

const CCMU_BORDER: Record<string, string> = {
  'red-600': 'border-l-red-600',
  'red-500': 'border-l-red-500',
  'orange-500': 'border-l-orange-500',
  'yellow-500': 'border-l-yellow-500',
  'green-500': 'border-l-green-500',
  'purple-500': 'border-l-purple-500',
  'gray-900': 'border-l-gray-700',
}

interface PatientQueueCardProps {
  item: NurseQueueItem
  isSelected: boolean
  onSelect: () => void
}

export function PatientQueueCard({ item, isSelected, onSelect }: PatientQueueCardProps) {
  const ccmuInfo = CCMU_MAP[item.ccmuLevel]
  const borderClass = CCMU_BORDER[ccmuInfo.color] ?? 'border-l-slate-500'
  const redFlagCount = item.patientData.clinical?.redFlags?.length ?? 0

  return (
    <motion.button
      layout
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-xl border-l-4 p-3 transition-colors',
        borderClass,
        isSelected
          ? 'bg-mistral-card-hover ring-1 ring-mistral-orange'
          : 'bg-mistral-card hover:bg-mistral-card-hover',
      )}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{item.patientName}</span>
            <span
              className={cn(
                'shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold',
                ccmuInfo.color === 'red-600' && 'bg-red-600 text-white',
                ccmuInfo.color === 'red-500' && 'bg-red-500 text-white',
                ccmuInfo.color === 'orange-500' && 'bg-orange-500 text-white',
                ccmuInfo.color === 'yellow-500' && 'bg-yellow-500 text-black',
                ccmuInfo.color === 'green-500' && 'bg-green-500 text-white',
                ccmuInfo.color === 'purple-500' && 'bg-purple-500 text-white',
                ccmuInfo.color === 'gray-900' && 'bg-gray-700 text-white',
              )}
            >
              {item.ccmuLevel}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{item.chiefComplaintShort}</p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1 text-slate-400">
            <Clock size={12} />
            <WaitTimer arrivalTime={item.arrivalTime} className="text-[11px]" />
          </div>
          {redFlagCount > 0 && (
            <div className="flex items-center gap-1 text-red-400">
              <AlertTriangle size={12} />
              <span className="text-[11px] font-medium">{redFlagCount}</span>
            </div>
          )}
        </div>
      </div>

      {item.assignedZone !== 'attente' && (
        <div className="mt-2">
          <ZoneBadge zone={item.assignedZone} />
        </div>
      )}
    </motion.button>
  )
}
