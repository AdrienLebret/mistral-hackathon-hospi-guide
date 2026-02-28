import { useState, useEffect } from 'react'

interface WaitTimerProps {
  arrivalTime: string
  className?: string
}

function formatWait(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return '<1 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return `${hours}h${remaining > 0 ? `${String(remaining).padStart(2, '0')}` : ''}`
}

export function WaitTimer({ arrivalTime, className = '' }: WaitTimerProps) {
  const [elapsed, setElapsed] = useState(() => Date.now() - new Date(arrivalTime).getTime())

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - new Date(arrivalTime).getTime())
    }, 30_000)
    return () => clearInterval(interval)
  }, [arrivalTime])

  return <span className={className}>{formatWait(elapsed)}</span>
}
