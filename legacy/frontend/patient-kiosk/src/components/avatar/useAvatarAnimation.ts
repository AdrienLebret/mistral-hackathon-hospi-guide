import { useEffect, useRef, useState } from 'react'
import type { AvatarState } from '@/types/kiosk'
import { ANIMATIONS } from './avatarSprites'

export function useAvatarAnimation(state: AvatarState) {
  const [frameIndex, setFrameIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    setFrameIndex(0)
    const anim = ANIMATIONS[state]
    if (!anim) return

    timerRef.current = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % anim.frames.length)
    }, anim.frameRate)

    return () => clearInterval(timerRef.current)
  }, [state])

  const anim = ANIMATIONS[state]
  const currentFrame = anim?.frames[frameIndex % (anim?.frames.length ?? 1)] ?? []

  return { currentFrame, frameIndex }
}
