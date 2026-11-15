import { afterEach, describe, expect, it, vi } from 'vitest'
import { httpApi } from './httpApi.ts'
import { ApiError } from './port.ts'
import { messageOf } from './errors.ts'

function mockFetch(res: Response | Error) {
  const f = vi.fn(async () => {
    if (res instanceof Error) throw res
    return res
  })
  vi.stubGlobal('fetch', f)
  return f
}

afterEach(() => vi.unstubAllGlobals())

describe('httpApi', () => {
  it.each([
    ['할 일 삭제', () => httpApi.deleteTask(7), '/api/tasks/7', 'DELETE'],
    ['응원 삭제', () => httpApi.deleteShareLinkComment(7), '/api/share-link-comments/7', 'DELETE'],
    ['링크 닫기', () => httpApi.closeShareLink(7), '/api/share-links/7/close', 'POST'],
    ['링크 삭제', () => httpApi.deleteShareLink(7), '/api/share-links/7', 'DELETE'],
    [
      '링크와 응원 삭제',
      () => httpApi.deleteShareLinkWithComments(7),
      '/api/share-links/7/with-comments',
      'DELETE',
    ],
  ] as const)('%s 요청은 페이지가 종료돼도 전송을 유지한다', async (_label, call, path, method) => {
    const f = mockFetch(new Response(null, { status: 204 }))
    await call()
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(path)
    expect(init.method).toBe(method)
    expect(init.keepalive).toBe(true)
    expect(init.credentials).toBe('same-origin')
  })

  it('moveTask는 POST /api/tasks/7/move에 JSON 본문과 same-origin으로 간다', async () => {
    const f = mockFetch(new Response('{"taskId":7}', { status: 200 }))
    await httpApi.moveTask(7, { toDate: '2026-11-03', toTimeSlot: 'MORNING' })
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/tasks/7/move')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('same-origin')
    expect(JSON.parse(init.body as string)).toEqual({ toDate: '2026-11-03', toTimeSlot: 'MORNING' })
  })

  it('404 TASK_NOT_FOUND는 ApiError(404, TASK_NOT_FOUND)가 된다', async () => {
    mockFetch(new Response('{"code":"TASK_NOT_FOUND"}', { status: 404 }))
    const err = await httpApi.completeTask(1).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(404)
    expect((err as ApiError).code).toBe('TASK_NOT_FOUND')
  })

  it('204는 undefined로 끝난다', async () => {
    mockFetch(new Response(null, { status: 204 }))
    await expect(httpApi.logout()).resolves.toBeUndefined()
  })

  it('fetch 예외는 NETWORK_ERROR가 된다', async () => {
    mockFetch(new TypeError('failed'))
    await expect(httpApi.getMe()).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })

  it('getMovesOfWeek는 /api/moves?week= 로 간다', async () => {
    const f = mockFetch(new Response('[]', { status: 200 }))
    await httpApi.getMovesOfWeek('2026-11-02')
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe('/api/moves?week=2026-11-02')
  })

  it('deleteShareLinkWithComments는 DELETE /api/share-links/3/with-comments로 간다', async () => {
    const f = mockFetch(new Response(null, { status: 204 }))
    await httpApi.deleteShareLinkWithComments(3)
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/share-links/3/with-comments')
    expect(init.method).toBe('DELETE')
  })

  it('모르는 코드는 INTERNAL_ERROR 문구가 된다', () => {
    expect(messageOf('WHATEVER')).toBe(messageOf('INTERNAL_ERROR'))
    expect(messageOf('DATE_LOCKED')).toBe('지난 기록이라 고칠 수 없어요.')
  })
})
