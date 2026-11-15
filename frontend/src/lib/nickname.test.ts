import { beforeEach, describe, expect, it } from 'vitest'
import { loadNickname, newNickname, NICKNAME_KEY, saveNickname } from './nickname.ts'

function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() {
      return m.size
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  }
}

describe('nickname', () => {
  let store: Storage
  beforeEach(() => {
    store = memoryStorage()
  })

  it('형용사와 동물을 붙인 10자 이하 이름을 만든다', () => {
    for (let i = 0; i < 200; i++) {
      const n = newNickname(Math.random)
      expect([...n].length).toBeLessThanOrEqual(10)
      expect([...n].length).toBeGreaterThanOrEqual(2)
    }
  })

  it('처음에는 새 이름을 만들어 기억한다', () => {
    const n = loadNickname(store, () => 0)
    expect(store.getItem(NICKNAME_KEY)).toBe(n)
  })

  it('기억한 이름이 있으면 그대로 쓴다', () => {
    saveNickname(store, '졸린 고양이')
    expect(loadNickname(store, () => 0.5)).toBe('졸린 고양이')
  })

  it('저장소를 못 써도 이름은 만든다', () => {
    const broken = {
      getItem: () => {
        throw new Error('x')
      },
      setItem: () => {
        throw new Error('x')
      },
    } as unknown as Storage
    expect(loadNickname(broken, () => 0).length).toBeGreaterThan(0)
  })
})
