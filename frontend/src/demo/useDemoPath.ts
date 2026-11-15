import { useIsDemo } from '../api/ApiContext.tsx'

export function useDemoPath(): (path: string) => string {
  const isDemo = useIsDemo()
  return (path) => (isDemo ? `/demo${path}` : path)
}
