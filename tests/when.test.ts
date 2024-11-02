import { describe, expect, it } from 'vitest'
import { when } from '../src/when'

describe('when', () => {
  it('returns the case-handled value', () => {
    function foo(b: 1 | 2): number {
      return when(b)({
        1: 10,
        2: 2
      })
    }

    expect(foo(1)).toEqual(10)
    expect(foo(2)).toEqual(2)
  })

  it('works with literals, expressions and statements', () => {
    function foo(b: 1 | 2 | 3): number {
      return when(b)({
        1: 5 + 5,
        2: (a) => a,
        else: (a) => a
      })
    }

    expect(foo(1)).toEqual(10)
    expect(foo(2)).toEqual(2)
    expect(foo(3)).toEqual(3)
  })

  it('works with type union return types (undefined)', () => {
    function foo(b: 1 | 2 | undefined): number | undefined {
      return when(b)({
        1: 1,
        2: (_) => undefined,
        else: (it) => it
      })
    }

    expect(foo(1)).toEqual(1)
    expect(foo(2)).toEqual(undefined)
  })

  it('works with undefined case', () => {
    function foo(b: 1 | 2 | 3 | undefined): number {
      return when(b)({
        1: 1,
        2: (it) => it,
        else: (it) => it ?? 3
      })
    }

    expect(foo(1)).toEqual(1)
    expect(foo(2)).toEqual(2)
    expect(foo(undefined)).toEqual(3)
  })
})
