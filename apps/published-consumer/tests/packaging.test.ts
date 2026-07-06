import { describe, expect, it } from 'bun:test'

import * as jule from '@fettstorch/jule'
import { awaitable, debounce, toMap, when } from '@fettstorch/jule'

/**
 * Packaging smoke test against the PUBLISHED package. Imports ONLY
 * through the package name (never ../src), so it exercises the real
 * exports map + built dist of the version currently on the npm
 * registry. Proves the released tarball is usable by a consumer.
 */
describe('@fettstorch/jule packaging (published)', () => {
  it('exposes every public value export through the barrel', () => {
    const expected = [
      'when',
      'awaitable',
      'subject',
      'Observable',
      'Once',
      'once',
      'cached',
      'sleep',
      'synchronize',
      'promiseQueue',
      'debounce',
      'debounced',
      'getDebouncer',
      'Debounced',
      'toMap',
      'retryable'
    ].sort()
    expect(Object.keys(jule).sort()).toEqual(expected)
  })

  it('awaitable round-trips through the packaged build', async () => {
    const signal = awaitable<number>()
    signal.resolve(42)
    expect(await signal).toBe(42)
  })

  it('when resolves the matching case', () => {
    expect(when(1 as 1 | 2)({ 1: 'a', else: 'b' })).toBe('a')
  })

  it('debounce coalesces calls', async () => {
    let count = 0
    const signal = awaitable<void>()
    const bump = () => {
      count++
      signal.resolve()
    }
    debounce(bump, 5)
    debounce(bump, 5)
    await signal
    expect(count).toBe(1)
  })

  it('toMap transforms entries', () => {
    const m = toMap(
      [
        ['a', 1],
        ['b', 2]
      ] as [string, number][],
      ([k, v]) => [k, v * 10]
    )
    expect(m.get('a')).toBe(10)
    expect(m.get('b')).toBe(20)
  })
})
