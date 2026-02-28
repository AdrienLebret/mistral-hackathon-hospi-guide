import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import type { AvatarState } from '@/types/kiosk'
import { PALETTE } from './avatarSprites'
import { useAvatarAnimation } from './useAvatarAnimation'

interface PixelArtAvatarProps {
  state: AvatarState
  size?: number // px per pixel, default 10
}

export function PixelArtAvatar({ state, size = 10 }: PixelArtAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { currentFrame } = useAvatarAnimation(state)

  const gridSize = 16
  const canvasSize = gridSize * size

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !currentFrame.length) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasSize, canvasSize)

    for (let y = 0; y < currentFrame.length; y++) {
      const row = currentFrame[y]
      if (!row) continue
      for (let x = 0; x < row.length; x++) {
        const colorIndex = row[x]
        if (colorIndex === undefined || colorIndex === 0) continue
        const color = PALETTE[colorIndex]
        if (!color || color === 'transparent') continue
        ctx.fillStyle = color
        ctx.fillRect(x * size, y * size, size, size)
      }
    }
  }, [currentFrame, size, canvasSize])

  return (
    <motion.div
      className="relative"
      animate={{
        y: state === 'idle' ? [0, -4, 0] : 0,
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <div
        className="rounded-2xl"
        style={{
          filter: 'drop-shadow(0 0 24px rgba(255, 112, 0, 0.35))',
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="image-rendering-pixelated"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
    </motion.div>
  )
}
