interface TurnstileApi {
  render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loading: Promise<TurnstileApi> | null = null

function load(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SRC
    s.async = true
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')))
    s.onerror = () => {
      loading = null
      reject(new Error('turnstile'))
    }
    document.head.appendChild(s)
  })
  return loading
}

export async function renderTurnstile(
  el: HTMLElement,
  callback: (token: string) => void,
): Promise<() => void> {
  const t = await load()
  const id = t.render(el, {
    sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY as string,
    callback,
  })
  return () => t.remove(id)
}

export async function resetTurnstile(): Promise<void> {
  if (window.turnstile) window.turnstile.reset()
}
