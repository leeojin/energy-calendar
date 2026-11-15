import { describe, expect, it } from 'vitest'
import type { PostcardDay } from './visibility.ts'
import { cheerIdeas } from './cheerIdeas.ts'

const TODAY = '2026-11-04'
const DATES = [
  '2026-11-02',
  '2026-11-03',
  '2026-11-04',
  '2026-11-05',
  '2026-11-06',
  '2026-11-07',
  '2026-11-08',
]

function week(
  items: Record<string, Array<[string, 'DONE' | 'PLANNED' | 'MISSED']>>,
): PostcardDay[] {
  return DATES.map((date) => ({
    date,
    items: (items[date] ?? []).map(([name, status]) => ({ name, status })),
  }))
}

describe('cheerIdeas', () => {
  it('오늘까지 한 일이 있는 가장 최근 날을 칭찬한다', () => {
    const r = cheerIdeas(
      week({ '2026-11-02': [['청소', 'DONE']], '2026-11-03': [['운동', 'DONE']] }),
      TODAY,
    )
    expect(r[0]).toBe('화요일 운동 했네 👏')
  })

  it('그날 일을 모두 했으면 둘 다 또는 다 했다고 한다', () => {
    const two = cheerIdeas(
      week({
        '2026-11-03': [
          ['a', 'DONE'],
          ['b', 'DONE'],
        ],
      }),
      TODAY,
    )
    expect(two[0]).toBe('화요일 둘 다 했네 👏')
    const three = cheerIdeas(
      week({
        '2026-11-04': [
          ['a', 'DONE'],
          ['b', 'DONE'],
          ['c', 'DONE'],
        ],
      }),
      TODAY,
    )
    expect(three[0]).toBe('오늘 다 했네 👏')
  })

  it('오늘 할 일이 있으면 화이팅을 넣는다', () => {
    const r = cheerIdeas(week({ '2026-11-04': [['발표 준비', 'PLANNED']] }), TODAY)
    expect(r).toContain('오늘 발표 준비 화이팅')
  })

  it('다음 할 일에는 힘내를 넣는다', () => {
    const r = cheerIdeas(week({ '2026-11-06': [['시험', 'PLANNED']] }), TODAY)
    expect(r).toContain('금요일 시험 힘내')
  })

  it('빈 날이 있으면 쉬어를 넣는다', () => {
    const r = cheerIdeas(week({ '2026-11-05': [['a', 'PLANNED']] }), TODAY)
    expect(r.some((x) => x.endsWith('푹 쉬어'))).toBe(true)
    const weekend = cheerIdeas(week({}), TODAY)
    expect(weekend).toContain('주말엔 푹 쉬어')
  })

  it('모자라면 기본 문구로 채운다', () => {
    const r = cheerIdeas(week({}), '2026-11-08')
    expect(r).toContain('잘하고 있어 👏')
    expect(r).toContain('이번 주도 화이팅')
  })

  it('못 한 일은 짚지 않는다', () => {
    const r = cheerIdeas(week({ '2026-11-02': [['숙제', 'MISSED']] }), TODAY)
    expect(r.join('|')).not.toContain('숙제')
  })

  it('30자를 넘는 문구는 뺀다', () => {
    const long = '아주아주아주아주아주아주아주아주 긴 이름의 할 일'
    const r = cheerIdeas(week({ '2026-11-03': [[long, 'DONE']] }), TODAY)
    expect(r.join('|')).not.toContain('아주아주')
  })

  it('최대 4개다', () => {
    const r = cheerIdeas(
      week({
        '2026-11-03': [['a', 'DONE']],
        '2026-11-04': [['b', 'PLANNED']],
        '2026-11-05': [['c', 'PLANNED']],
      }),
      TODAY,
    )
    expect(r.length).toBeLessThanOrEqual(4)
  })
})
