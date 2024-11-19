import { describe, expect, it } from 'vitest'
import { toMap } from '../src'

describe('toMap', () => {
  it('should transform array', () => {
    const map = toMap([1, 2, 3], (value, idx) => [idx, value * 2])
    expect(map.size).toBe(3)
    expect(map.get(0)).toBe(2)
    expect(map.get(1)).toBe(4)
    expect(map.get(2)).toBe(6)
  })

  it('should transform object', () => {
    const map = toMap({ a: 1, b: 2, c: 3 }, ([key, value], idx) => [key, value + idx])
    expect(map.size).toBe(3)
    expect(map.get('a')).toBe(1)
    expect(map.get('b')).toBe(3)
    expect(map.get('c')).toBe(5)
  })

  it('should transform map', () => {
    const map = new Map([
      ['a', 2],
      ['b', 4],
      ['c', 6]
    ])
    const newMap: Map<string, string> = toMap(map, ([key, value], idx) => [
      key,
      `${value * 2}${idx}`
    ])
    expect(newMap.size).toBe(3)
    expect(newMap.get('a')).toBe('40')
    expect(newMap.get('b')).toBe('81')
    expect(newMap.get('c')).toBe('122')
  })
})
