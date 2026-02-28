import { motion } from 'framer-motion'
import type { CcmuLevel } from '@/types/ccmu'
import { CCMU_MAP } from '@/types/ccmu'

interface CcmuBadgeProps {
  level: CcmuLevel
  showLabel?: boolean
}

const COLOR_CLASSES: Record<string, string> = {
  'green-500': 'bg-green-500 text-white',
  'yellow-500': 'bg-yellow-500 text-black',
  'orange-500': 'bg-orange-500 text-white',
  'red-500': 'bg-red-500 text-white',
  'red-600': 'bg-red-600 text-white',
  'purple-500': 'bg-purple-500 text-white',
  'gray-900': 'bg-gray-900 text-white border border-gray-700',
}

export function CcmuBadge({ level, showLabel = true }: CcmuBadgeProps) {
  const info = CCMU_MAP[level]
  const colorClass = COLOR_CLASSES[info.color] ?? 'bg-gray-500 text-white'
  const isPulsing = level === '4' || level === '5'

  return (
    <motion.div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${colorClass}`}
      animate={isPulsing ? { scale: [1, 1.05, 1] } : undefined}
      transition={isPulsing ? { duration: 1.2, repeat: Infinity } : undefined}
    >
      <span>CCMU {info.level}</span>
      {showLabel && (
        <span className="font-normal text-xs opacity-90">— {info.priority}</span>
      )}
    </motion.div>
  )
}
