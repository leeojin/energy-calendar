import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { RequireLogin } from './auth/RequireLogin.tsx'
import { DemoRoutes } from './demo/DemoRoutes.tsx'
import { flushAll } from './lib/undo.ts'
import { AccountPage } from './pages/AccountPage.tsx'
import { CoverPage } from './pages/CoverPage.tsx'
import { SharePage } from './pages/SharePage.tsx'
import { MovesPage } from './pages/MovesPage.tsx'
import { MonthPage } from './pages/MonthPage.tsx'
import { PublicSharePage } from './pages/PublicSharePage.tsx'
import { SignupPage } from './pages/SignupPage.tsx'
import { WeekPage } from './pages/WeekPage.tsx'
import type { ReactNode } from 'react'

function Placeholder({ name }: { name: string }): ReactNode {
  return <div data-screen={name} />
}

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => () => flushAll(), [pathname])
  useEffect(() => {
    window.addEventListener('pagehide', flushAll)
    return () => window.removeEventListener('pagehide', flushAll)
  }, [])
  return (
    <Routes>
      <Route path="/" element={<CoverPage />} />
      <Route path="/signup" element={<SignupPage />} />
      {['/moves', '/moves/:monday'].map((path) => (
        <Route
          key={path}
          path={path}
          element={
            <RequireLogin>
              <MovesPage />
            </RequireLogin>
          }
        />
      ))}
      {['/share', '/share/:shareLinkId'].map((path) => (
        <Route
          key={path}
          path={path}
          element={
            <RequireLogin>
              <SharePage />
            </RequireLogin>
          }
        />
      ))}
      <Route
        path="/me"
        element={
          <RequireLogin>
            <AccountPage />
          </RequireLogin>
        }
      />
      <Route
        path="/week"
        element={
          <RequireLogin>
            <WeekPage />
          </RequireLogin>
        }
      />
      <Route
        path="/week/:monday"
        element={
          <RequireLogin>
            <WeekPage />
          </RequireLogin>
        }
      />
      {['/month', '/month/:month'].map((path) => (
        <Route
          key={path}
          path={path}
          element={
            <RequireLogin>
              <MonthPage />
            </RequireLogin>
          }
        />
      ))}
      <Route path="/s/:token" element={<PublicSharePage />} />
      <Route path="/demo/*" element={<DemoRoutes />} />
      <Route path="*" element={<Placeholder name="notfound" />} />
    </Routes>
  )
}
