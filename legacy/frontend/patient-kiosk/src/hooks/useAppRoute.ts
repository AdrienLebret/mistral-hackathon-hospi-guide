import { useState, useEffect } from 'react'

export type AppRoute = 'kiosk' | 'dashboard'

function getRouteFromHash(): AppRoute {
  return window.location.hash === '#/dashboard' ? 'dashboard' : 'kiosk'
}

export function useAppRoute(): [AppRoute, (route: AppRoute) => void] {
  const [route, setRoute] = useState<AppRoute>(getRouteFromHash)

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (next: AppRoute) => {
    window.location.hash = next === 'dashboard' ? '#/dashboard' : '#/kiosk'
  }

  return [route, navigate]
}
