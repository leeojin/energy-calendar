import { describe, expect, it } from 'vitest'
import {
  weekRangeText,
  addDays,
  daysText,
  isoWeekdays,
  mondayOf,
  occurrencePreview,
  occurrenceSentence,
  todayKst,
  weekTitle,
} from './dates'

describe('dates', () => {
  it('수요일의 그 주 월요일을 구한다', () => {
    expect(mondayOf('2026-11-04')).toBe('2026-11-02')
    expect(mondayOf('2026-11-02')).toBe('2026-11-02')
    expect(mondayOf('2026-11-08')).toBe('2026-11-02')
  })

  it('날짜를 더하고 뺀다', () => {
    expect(addDays('2026-11-02', 7)).toBe('2026-11-09')
    expect(addDays('2026-11-02', -1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('주 제목은 목요일이 든 달의 몇째 주다', () => {
    expect(weekTitle('2026-10-26')).toEqual({ year: 2026, month: 10, weekOfMonth: 5 })
    expect(weekTitle('2026-11-02')).toEqual({ year: 2026, month: 11, weekOfMonth: 1 })
    expect(weekTitle('2025-12-29')).toEqual({ year: 2026, month: 1, weekOfMonth: 1 })
  })

  it('한국 시각 자정을 넘기면 다음 날이다', () => {
    expect(todayKst(new Date('2026-11-04T15:30:00Z'))).toBe('2026-11-05')
    expect(todayKst(new Date('2026-11-04T14:59:00Z'))).toBe('2026-11-04')
  })

  it('요일 비트 마스크를 요일 번호로 바꾼다', () => {
    expect(isoWeekdays(21)).toEqual([0, 2, 4])
  })
})

describe('occurrencePreview', () => {
  const today = '2026-11-04'
  it('이번 주는 오늘 앞 날을 뺀다', () => {
    expect(occurrencePreview(21, '2026-11-04', null, '2026-11-02', today)).toEqual([
      '2026-11-04',
      '2026-11-06',
    ])
  })
  it('다음 주는 월수금 셋', () => {
    expect(occurrencePreview(21, '2026-11-04', null, '2026-11-09', today)).toEqual([
      '2026-11-09',
      '2026-11-11',
      '2026-11-13',
    ])
  })
  it('지난주는 비어 있다', () => {
    expect(occurrencePreview(21, '2026-11-04', null, '2026-10-26', today)).toEqual([])
  })
  it('8주 뒤까지만 보이고 9주 뒤는 비어 있다', () => {
    expect(occurrencePreview(21, '2026-11-04', null, '2026-12-28', today)).toEqual([
      '2026-12-28',
      '2026-12-30',
      '2027-01-01',
    ])
    expect(occurrencePreview(21, '2026-11-04', null, '2027-01-04', today)).toEqual([])
  })
  it('시작일과 끝나는 날을 지킨다', () => {
    expect(occurrencePreview(21, '2026-11-11', null, '2026-11-09', today)).toEqual([
      '2026-11-11',
      '2026-11-13',
    ])
    expect(occurrencePreview(21, '2026-11-04', '2026-11-11', '2026-11-09', today)).toEqual([
      '2026-11-09',
      '2026-11-11',
    ])
  })
  it('매일이면 다음 주에 7일', () => {
    expect(occurrencePreview(127, '2026-11-04', null, '2026-11-09', today)).toHaveLength(7)
  })
})

describe('occurrenceSentence', () => {
  it('이번 주에 나오는 날을 말한다', () => {
    expect(occurrenceSentence(20, '2026-11-04', null, '오후', '2026-11-04')).toBe(
      '이번 주에는 수 11/4, 금 11/6 오후에 나와요.',
    )
  })
  it('남은 날이 없으면 안 나온다고 말한다', () => {
    expect(occurrenceSentence(1, '2026-11-04', null, '오후', '2026-11-04')).toBe(
      '이번 주에는 안 나와요.',
    )
  })
  it('요일이 없으면 고르라고 말한다', () => {
    expect(occurrenceSentence(0, '2026-11-04', null, '오후', '2026-11-04')).toBe('요일을 골라요.')
  })
})

describe('daysText', () => {
  it('요일 이름을 붙여 쓴다', () => {
    expect(daysText(21)).toBe('월수금')
    expect(daysText(127)).toBe('매일')
    expect(daysText(63)).toBe('월–토')
  })
})

describe('weekRangeText', () => {
  it('같은 달 · 달이 바뀜 · 해가 바뀜', () => {
    expect(weekRangeText('2026-11-09', '2026-11-15')).toBe('2026년 11월 9일 – 15일')
    expect(weekRangeText('2026-10-26', '2026-11-01')).toBe('2026년 10월 26일 – 11월 1일')
    expect(weekRangeText('2026-12-28', '2027-01-03')).toBe('2026년 12월 28일 – 2027년 1월 3일')
  })
})
