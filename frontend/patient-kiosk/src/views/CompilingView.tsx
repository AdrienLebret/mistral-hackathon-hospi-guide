import { motion } from 'framer-motion'
import { PixelArtAvatar } from '@/components/avatar/PixelArtAvatar'

export function CompilingView() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center gap-8 w-full max-w-lg mx-auto py-16"
    >
      <PixelArtAvatar state="idle" size={8} />

      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="w-3 h-3 rounded-full bg-mistral-orange"
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-xl text-slate-200 font-medium">
            Compiling your record...
          </span>
        </motion.div>

        <motion.p
          className="text-sm text-slate-500 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Analyzing your information. This will only take a moment.
        </motion.p>

        {/* Progress bar animation */}
        <motion.div
          className="w-64 h-1 bg-slate-700 rounded-full overflow-hidden mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.div
            className="h-full bg-mistral-orange rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '90%' }}
            transition={{ duration: 15, ease: 'easeOut' }}
          />
        </motion.div>
      </div>
    </motion.div>
  )
}
