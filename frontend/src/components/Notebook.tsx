import type { ReactNode } from 'react'

export function Notebook({ wide = false, children }: { wide?: boolean; children: ReactNode }) {
  return <main className={wide ? 'wrap wide' : 'wrap'}>{children}</main>
}
