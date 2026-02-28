import { AlertTriangle } from 'lucide-react'

interface RedFlagsAlertProps {
  flags: string[]
}

export function RedFlagsAlert({ flags }: RedFlagsAlertProps) {
  if (flags.length === 0) return null

  return (
    <div className="rounded-xl bg-red-950/50 border border-red-800 p-3">
      <div className="flex items-center gap-2 text-red-400 font-semibold text-sm mb-2">
        <AlertTriangle size={16} />
        Drapeaux rouges ({flags.length})
      </div>
      <ul className="space-y-1">
        {flags.map((flag, i) => (
          <li key={i} className="text-sm text-red-300 flex items-start gap-2">
            <span className="text-red-500 mt-0.5">*</span>
            {flag}
          </li>
        ))}
      </ul>
    </div>
  )
}
