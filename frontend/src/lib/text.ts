const ALLOWED_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x30, 0x39],
  [0x41, 0x5a],
  [0x61, 0x7a],
  [0xac00, 0xd7a3],
  [0x3131, 0x318e],
  [0x1f000, 0x1faff],
  [0x2600, 0x27bf],
  [0x2300, 0x23ff],
  [0x2b00, 0x2bff],
  [0x2190, 0x21ff],
  [0x3030, 0x3030],
  [0x303d, 0x303d],
  [0x3297, 0x3297],
  [0x3299, 0x3299],
  [0xa9, 0xa9],
  [0xae, 0xae],
  [0x2122, 0x2122],
  [0x203c, 0x203c],
  [0x2049, 0x2049],
  [0xfe0f, 0xfe0f],
  [0x200d, 0x200d],
  [0x20e3, 0x20e3],
  [0xe0020, 0xe007f],
]
const ALLOWED_SYMBOLS = new Set(' .,!?~-():/'.split('').map((c) => c.codePointAt(0)!))

export function cpLength(s: string): number {
  return [...s].length
}

export function cutToCodePoints(s: string, max: number): string {
  return [...s].slice(0, max).join('')
}

export function isAllowedText(s: string, max?: number): boolean {
  const t = s.trim()
  if (t.length === 0) return false
  if (max !== undefined && cpLength(t) > max) return false
  for (const ch of t) {
    const cp = ch.codePointAt(0)!
    if (ALLOWED_SYMBOLS.has(cp)) continue
    if (!ALLOWED_RANGES.some(([a, b]) => cp >= a && cp <= b)) return false
  }
  return true
}

export interface Hint {
  text: string
  ok: boolean
}

export function usernameHint(id: string): Hint[] {
  const n = cpLength(id)
  return [
    { text: '영어 소문자, 숫자만', ok: /^[a-z0-9]+$/.test(id) },
    { text: '4~20글자', ok: n >= 4 && n <= 20 },
  ]
}

export function passwordHint(pw: string): Hint[] {
  const kinds = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length
  return [
    { text: '8~16글자', ok: pw.length >= 8 && pw.length <= 16 },
    { text: '영어 대문자, 소문자, 숫자, 기호 중 3가지', ok: kinds >= 3 },
    { text: '영어, 숫자, 기호만', ok: /^[!-~]*$/.test(pw) },
  ]
}
