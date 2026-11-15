import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { ApiPort } from './port.ts'
import { httpApi } from './httpApi.ts'

interface ApiContextValue {
  api: ApiPort
  isDemo: boolean
}

const ApiContext = createContext<ApiContextValue>({ api: httpApi, isDemo: false })

export function ApiProvider({
  value,
  isDemo = false,
  children,
}: {
  value: ApiPort
  isDemo?: boolean
  children: ReactNode
}) {
  return <ApiContext.Provider value={{ api: value, isDemo }}>{children}</ApiContext.Provider>
}

export function useApi(): ApiPort {
  return useContext(ApiContext).api
}

export function useIsDemo(): boolean {
  return useContext(ApiContext).isDemo
}
