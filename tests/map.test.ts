import { describe, expect, it } from 'vitest'
import { mapValues } from '../src/map'

describe('map', () => {
  describe('mapValues', () => {
    it('returns a map with transformed values', () => {
      const originalMap: Map<string, number> = new Map([
        ['a', 1],
        ['b', 2]
      ])
      const transformedMap: Map<string, string> = mapValues(originalMap, (value) =>
        value.toString()
      )
      expect(transformedMap.get('a')).toBe('1')
      expect(transformedMap.get('b')).toBe('2')
    })
  })
})
