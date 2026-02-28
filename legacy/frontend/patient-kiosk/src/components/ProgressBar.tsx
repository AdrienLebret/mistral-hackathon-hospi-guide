import { motion } from 'framer-motion'

interface ProgressBarProps {
  progress: number // 0-100
}

export function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-mistral-orange to-mistral-amber"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  )
}
