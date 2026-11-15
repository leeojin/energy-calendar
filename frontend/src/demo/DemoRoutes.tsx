import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { ApiProvider } from '../api/ApiContext.tsx'
import { SessionProvider } from '../auth/SessionContext.tsx'
import { MonthPage } from '../pages/MonthPage.tsx'
import { MovesPage } from '../pages/MovesPage.tsx'
import { SharePage } from '../pages/SharePage.tsx'
import { WeekPage } from '../pages/WeekPage.tsx'
import { RequireLogin } from '../auth/RequireLogin.tsx'
import { DemoBar } from './DemoBar.tsx'
import { demoApi } from './demoApi.ts'

export function DemoRoutes() {
  const [round, setRound] = useState(0)
  return (
    <ApiProvider value={demoApi} isDemo>
      <SessionProvider key={round}>
        <DemoBar onReset={() => setRound((n) => n + 1)} />
        <RequireLogin>
          <Routes>
            <Route path="week" element={<WeekPage />} />
            <Route path="week/:monday" element={<WeekPage />} />
            <Route path="month" element={<MonthPage />} />
            <Route path="month/:month" element={<MonthPage />} />
            <Route path="moves" element={<MovesPage />} />
            <Route path="moves/:monday" element={<MovesPage />} />
            <Route path="share" element={<SharePage />} />
            <Route path="share/:shareLinkId" element={<SharePage />} />
            <Route path="*" element={<Navigate to="/demo/week" replace />} />
          </Routes>
        </RequireLogin>
      </SessionProvider>
    </ApiProvider>
  )
}
