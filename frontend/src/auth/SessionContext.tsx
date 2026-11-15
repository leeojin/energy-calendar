import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ApiProvider, useApi, useIsDemo } from '../api/ApiContext.tsx'
import { messageOf } from '../api/errors.ts'
import { ApiError } from '../api/port.ts'
import type { ApiPort } from '../api/port.ts'
import type { MeResponse } from '../api/types.ts'
import { notifyError } from '../lib/notify.ts'

export const RETURN_TO_KEY = 'ec.returnTo'

type Status = 'loading' | 'in' | 'out'

interface SessionValue {
  status: Status
  me: MeResponse | null
  setMe: (me: MeResponse) => void
  onLoggedIn: (me: MeResponse) => void
  onLoggedOut: () => void
}

const SessionContext = createContext<SessionValue | null>(null)

const QUIET: ReadonlyArray<keyof ApiPort> = ['getMe', 'login', 'signup', 'logout']

export function SessionProvider({ children }: { children: ReactNode }) {
  const baseApi = useApi()
  const isDemo = useIsDemo()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')
  const [me, setMeState] = useState<MeResponse | null>(null)

  const onAuthRequired = useCallback(() => {
    sessionStorage.setItem(RETURN_TO_KEY, window.location.pathname + window.location.search)
    setMeState(null)
    setStatus('out')
    notifyError(messageOf('AUTH_REQUIRED'))
    void navigate('/', { replace: true })
  }, [navigate])

  const api = useMemo<ApiPort>(() => {
    if (isDemo) return baseApi
    const wrapped = {} as Record<string, unknown>
    for (const key of Object.keys(baseApi) as Array<keyof ApiPort>) {
      const fn = baseApi[key] as (...args: unknown[]) => Promise<unknown>
      wrapped[key] = async (...args: unknown[]) => {
        try {
          return await fn(...args)
        } catch (e) {
          if (e instanceof ApiError && e.code === 'AUTH_REQUIRED' && !QUIET.includes(key)) {
            onAuthRequired()
          }
          throw e
        }
      }
    }
    return wrapped as unknown as ApiPort
  }, [baseApi, isDemo, onAuthRequired])

  useEffect(() => {
    let alive = true
    baseApi
      .getMe()
      .then((m) => {
        if (!alive) return
        setMeState(m)
        setStatus('in')
      })
      .catch(() => {
        if (!alive) return
        setStatus('out')
      })
    return () => {
      alive = false
    }
  }, [baseApi, isDemo])

  const value = useMemo<SessionValue>(
    () => ({
      status,
      me,
      setMe: (m) => setMeState(m),
      onLoggedIn: (m) => {
        setMeState(m)
        setStatus('in')
        const back = sessionStorage.getItem(RETURN_TO_KEY)
        sessionStorage.removeItem(RETURN_TO_KEY)
        void navigate(back && back.startsWith('/') && !back.startsWith('//') ? back : '/week', {
          replace: true,
        })
      },
      onLoggedOut: () => {
        setMeState(null)
        setStatus('out')
        void navigate('/', { replace: true })
      },
    }),
    [status, me, navigate],
  )

  return (
    <ApiProvider value={api} isDemo={isDemo}>
      <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
    </ApiProvider>
  )
}

export function useSession(): SessionValue {
  const v = useContext(SessionContext)
  if (!v) throw new Error('SessionProvider 안에서만 쓸 수 있어요')
  return v
}
