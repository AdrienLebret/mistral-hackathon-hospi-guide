import { Users, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'

interface DashboardHeaderProps {
  stats: {
    total: number
    critical: number
    waiting: number
    oriented: number
    avgWaitMin: number
  }
}

export function DashboardHeader({ stats }: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold">
          <span className="bg-gradient-to-r from-mistral-orange to-mistral-amber bg-clip-text text-transparent">
            TRIASTRAL
          </span>
          <span className="text-slate-500 font-normal text-sm ml-2">Nurse Coordinator</span>
        </h1>
      </div>

      <div className="flex items-center gap-6">
        <Stat icon={Users} label="Patients" value={stats.total} color="text-white" />
        <Stat icon={AlertTriangle} label="Critical" value={stats.critical} color="text-red-400" />
        <Stat icon={Clock} label="Avg. wait" value={`${stats.avgWaitMin} min`} color="text-amber-400" />
        <Stat icon={CheckCircle2} label="Oriented" value={stats.oriented} color="text-green-400" />
      </div>
    </header>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className={color} />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`text-sm font-bold ${color}`}>{value}</p>
      </div>
    </div>
  )
}
