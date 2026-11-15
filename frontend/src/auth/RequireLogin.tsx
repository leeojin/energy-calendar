import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useSession } from './SessionContext.tsx'

export function RequireLogin({ children }: { children: ReactNode }) {
  const { status } = useSession()
  if (status === 'loading') return null
  if (status === 'out') return <Navigate to="/" replace />
  return <>{children}</>
}
