import { useEffect, useState } from 'react'

interface TypewriterTextProps {
  text: string
  speed?: number // ms per character
  onComplete?: () => void
  className?: string
}

export function TypewriterText({ text, speed = 30, onComplete, className }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    setDisplayed('')
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(timer)
        onComplete?.()
      }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed, onComplete])

  return <span className={className}>{displayed}<span className="animate-pulse">|</span></span>
}
