import { describe, expect, it } from 'vitest'
import { cpLength, cutToCodePoints, isAllowedText, passwordHint, usernameHint } from './text.ts'

describe('text', () => {
  it('글자 수는 코드 포인트로 센다', () => {
    expect(cpLength('산책🌿')).toBe(3)
    expect(cpLength('')).toBe(0)
  })

  it('코드 포인트 수만큼 자른다', () => {
    expect(cutToCodePoints('가나다라', 2)).toBe('가나')
    expect(cutToCodePoints('산책🌿끝', 3)).toBe('산책🌿')
  })

  it('허용 글자 검사', () => {
    expect(isAllowedText('산책 가기')).toBe(true)
    expect(isAllowedText('Hello. , ! ? ~ - ( ) : /')).toBe(true)
    for (const ok of ['👏', '👍🏻', '👨‍👩‍👧', '🇰🇷', '❤️']) expect(isAllowedText(ok)).toBe(true)
    for (const bad of ['<a>', '"', "'", '&', '`', 'a\nb', 'a\tb', 'a;b', 'a=b']) {
      expect(isAllowedText(bad)).toBe(false)
    }
  })

  it('공백만 있으면 거부하고 20/21 글자 경계를 본다', () => {
    expect(isAllowedText('   ')).toBe(false)
    expect(isAllowedText('가'.repeat(20), 20)).toBe(true)
    expect(isAllowedText('가'.repeat(21), 20)).toBe(false)
  })

  it('아이디 안내 줄', () => {
    const bad = usernameHint('AB')
    expect(bad[0]).toEqual({ text: '영어 소문자, 숫자만', ok: false })
    expect(bad[1].ok).toBe(false)
    const good = usernameHint('sujin12')
    expect(good.every((h) => h.ok)).toBe(true)
    expect(usernameHint('sujin_k')[0].ok).toBe(false)
    expect(usernameHint('a'.repeat(21))[1].ok).toBe(false)
  })

  it('비밀번호 안내 줄', () => {
    expect(passwordHint('1234567')[0].ok).toBe(false)
    expect(passwordHint('12345678')[0].ok).toBe(true)
    expect(passwordHint('a'.repeat(17))[0].ok).toBe(false)
    expect(passwordHint('12345678')[1].ok).toBe(false)
    expect(passwordHint('Abcd1234')[1].ok).toBe(true)
    for (const bad of ['Abcd123가', 'Abcd123ㅋ', 'Abcd123😀', 'Abcd 1234', 'Abcd123\u200b']) {
      expect(passwordHint(bad)[2].ok).toBe(false)
    }
    expect(passwordHint('Abcd123\\')[2].ok).toBe(true)
    expect(passwordHint('Abcd1234').every((h) => h.ok)).toBe(true)
  })
})
