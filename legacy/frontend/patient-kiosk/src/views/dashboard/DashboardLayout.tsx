import type { ReactNode } from 'react'

interface DashboardLayoutProps {
  left: ReactNode
  right: ReactNode
}

export function DashboardLayout({ left, right }: DashboardLayoutProps) {
  return (
    <div className="flex-1 grid grid-cols-[380px_1fr] min-h-0">
      <div className="border-r border-slate-800 pt-3 overflow-hidden flex flex-col">
        {left}
      </div>
      <div className="overflow-hidden flex flex-col">
        {right}
      </div>
    </div>
  )
}
