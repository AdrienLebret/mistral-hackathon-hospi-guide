import { useAppRoute } from '@/hooks/useAppRoute'
import { KioskPage } from '@/pages/KioskPage'
import { DashboardPage } from '@/pages/DashboardPage'

function App() {
  const [route] = useAppRoute()

  return route === 'dashboard' ? <DashboardPage /> : <KioskPage />
}

export default App
