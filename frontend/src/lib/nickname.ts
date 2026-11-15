export const NICKNAME_KEY = 'ec.cheerNickname'

const ADJECTIVES = [
  '졸린',
  '느긋한',
  '반짝이는',
  '배고픈',
  '용감한',
  '조용한',
  '신난',
  '말랑한',
  '튼튼한',
  '든든한',
]
const ANIMALS = ['고양이', '토끼', '곰', '여우', '펭귄', '다람쥐', '오리', '판다', '거북이', '수달']

export function newNickname(random: () => number = Math.random): string {
  const pick = <T>(xs: readonly T[]): T =>
    xs[Math.min(xs.length - 1, Math.floor(random() * xs.length))]
  return `${pick(ADJECTIVES)} ${pick(ANIMALS)}`
}

export function saveNickname(store: Storage, name: string): void {
  try {
    store.setItem(NICKNAME_KEY, name)
  } catch {
    // 저장 실패 무시
  }
}

export function loadNickname(store: Storage, random: () => number = Math.random): string {
  try {
    const saved = store.getItem(NICKNAME_KEY)
    if (saved && saved.trim()) return saved
  } catch {
    // 저장소 접근 실패 무시
  }
  const n = newNickname(random)
  saveNickname(store, n)
  return n
}
