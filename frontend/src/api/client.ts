import { ApiError } from './port.ts'
import type { ErrorCode } from './types.ts'

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, credentials: 'same-origin' }
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  let res: Response
  try {
    res = await fetch(path, init)
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR')
  }
  if (!res.ok) {
    let code: ErrorCode = 'INTERNAL_ERROR'
    try {
      const data = (await res.json()) as { code?: ErrorCode }
      if (data && typeof data.code === 'string') code = data.code
    } catch {
      // JSON 파싱 실패 무시
    }
    throw new ApiError(res.status, code)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
