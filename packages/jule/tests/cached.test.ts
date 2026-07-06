import { describe, expect, it } from 'vitest'

import { cached } from '../src/cached'

describe('cached', () => {
  it('should only compute once when no eviction condition is met', () => {
    let a = 0
    const originalFunction = (b: number) => b + ++a
    const cachedFunction = cached(originalFunction)

    const resultOne = cachedFunction(1)
    const resultTwo = cachedFunction(1)
    const resultThree = cachedFunction(2)
    const resultFour = cachedFunction(2)

    expect(a).toBe(2)
    expect(resultOne).toBe(2)
    expect(resultTwo).toBe(resultOne)
    expect(resultThree).toBe(4)
    expect(resultFour).toBe(resultThree)
  })

  it('should keep exact return values and not reduce null to undefined', () => {
    const cachedReturningNull = cached(() => null)
    const cachedReturningUndefined = cached(() => undefined)
    expect(cachedReturningNull()).toEqual(null)
    expect(cachedReturningUndefined()).toEqual(undefined)
  })

  it('should return undefined as cached value for an original void returning function', () => {
    const cachedReturningVoid = cached(() => {})
    expect(cachedReturningVoid()).toEqual(undefined)
  })

  it('should only ever execute a function once', () => {
    let counter = 0
    const originalFunction = () => {
      counter++
    }
    const cachedFunction = cached(originalFunction)
    cachedFunction()
    cachedFunction()
    cachedFunction()
    cachedFunction()
    expect(counter).toEqual(1)
  })

  it('should cache independently for different arguments', () => {
    let calls = 0
    const cachedFunction = cached((n: number) => {
      calls++
      return n * 2
    })

    expect(cachedFunction(2)).toBe(4)
    expect(cachedFunction(3)).toBe(6)
    expect(cachedFunction(2)).toBe(4)
    expect(cachedFunction(3)).toBe(6)
    expect(calls).toBe(2)
  })

  it('should not create shared state in- and between instances', () => {
    class TestClass {
      constructor(public readonly data: number) {}
      foo = cached(() => this.data)
      bar = cached(() => this.data + 1)
    }

    const testInstance1 = new TestClass(1)
    const testInstance2 = new TestClass(2)

    expect(testInstance1.foo()).toEqual(1)
    expect(testInstance1.bar()).toEqual(2)

    expect(testInstance2.foo()).toEqual(2)
    expect(testInstance2.bar()).toEqual(3)
  })

  it('should recompute the value once the ttl has elapsed', () => {
    let now = 1000
    let calls = 0
    const cachedFunction = cached(
      () => {
        calls++
        return calls * 10
      },
      { ttlMs: 100, timeProvider: { now: () => now } }
    )

    expect(cachedFunction()).toBe(10)

    now = 1100 // exactly at the ttl boundary: still fresh (needs to be strictly greater)
    expect(cachedFunction()).toBe(10)
    expect(calls).toBe(1)

    now = 1101 // ttl exceeded -> recompute
    expect(cachedFunction()).toBe(20)
    expect(calls).toBe(2)
  })

  it('should not share a cache between wrappers over the same function reference', () => {
    let calls = 0
    const originalFunction = (n: number) => {
      calls++
      return n * 10
    }

    const cachedA = cached(originalFunction)
    const cachedB = cached(originalFunction)

    expect(cachedA(1)).toBe(10)
    expect(cachedB(1)).toBe(10)

    // each wrapper owns an independent cache, so the shared reference is
    // computed once per wrapper rather than once in total
    expect(calls).toBe(2)
  })

  it('should share state across wrappers when an explicit cache is passed', () => {
    let calls = 0
    const sharedCache = {}
    const compute = (n: number) => {
      calls++
      return n * 10
    }

    const cachedA = cached(compute, { cache: sharedCache })
    const cachedB = cached(compute, { cache: sharedCache })

    expect(cachedA(1)).toBe(10)
    // cachedB reads cachedA's entry from the shared cache -> no recompute
    expect(cachedB(1)).toBe(10)
    expect(calls).toBe(1)

    // a different argument is a different key, so it computes once and is then
    // visible to the other wrapper as well
    expect(cachedB(2)).toBe(20)
    expect(cachedA(2)).toBe(20)
    expect(calls).toBe(2)
  })

  it('should isolate wrappers sharing a cache when they use distinct cacheKeys', () => {
    let calls = 0
    const sharedCache = {}
    const compute = (n: number) => {
      calls++
      return n * 10
    }

    const cachedA = cached(compute, { cache: sharedCache, cacheKey: 'a' })
    const cachedB = cached(compute, { cache: sharedCache, cacheKey: 'b' })

    expect(cachedA(1)).toBe(10)
    // same cache, but the distinct cacheKey keeps the entries separate
    expect(cachedB(1)).toBe(10)
    expect(calls).toBe(2)
  })

  it('should key the cache on the full argument list for multi-arg functions', () => {
    let calls = 0
    const cachedFunction = cached((a: number, b: number) => {
      calls++
      return a * b
    })

    expect(cachedFunction(2, 3)).toBe(6)
    expect(cachedFunction(2, 3)).toBe(6) // same args -> cached, no recompute
    expect(calls).toBe(1)

    // a change in any argument is a distinct key -> recompute
    expect(cachedFunction(3, 2)).toBe(6)
    expect(cachedFunction(2, 4)).toBe(8)
    expect(calls).toBe(3)
  })

  it('should treat distinct object arguments as distinct cache keys', () => {
    let calls = 0
    const cachedFunction = cached((o: { id: number }) => {
      calls++
      return o.id
    })

    expect(cachedFunction({ id: 1 })).toBe(1)
    // a structurally different object must not hit the previous entry
    expect(cachedFunction({ id: 2 })).toBe(2)
    expect(calls).toBe(2)
  })

  it('should recompute an evicted entry on the next call', () => {
    let calls = 0
    const cachedFunction = cached((n: number) => {
      calls++
      return n * 10
    })

    expect(cachedFunction(1)).toBe(10)
    expect(cachedFunction(1)).toBe(10)
    expect(calls).toBe(1)

    cachedFunction.evict(1)
    expect(cachedFunction(1)).toBe(10)
    expect(calls).toBe(2) // recomputed after eviction
  })

  it('should only evict the targeted argument entry', () => {
    let calls = 0
    const cachedFunction = cached((n: number) => {
      calls++
      return n * 10
    })

    cachedFunction(1)
    cachedFunction(2)
    expect(calls).toBe(2)

    cachedFunction.evict(1)
    cachedFunction(1) // recomputes
    cachedFunction(2) // still cached
    expect(calls).toBe(3)
  })

  it('should treat evicting a non-existent entry as a no-op', () => {
    let calls = 0
    const cachedFunction = cached((n: number) => {
      calls++
      return n * 10
    })

    expect(() => cachedFunction.evict(42)).not.toThrow()
    expect(cachedFunction(1)).toBe(10)
    expect(calls).toBe(1)
  })

  it('should recompute every entry after clear', () => {
    let calls = 0
    const cachedFunction = cached((n: number) => {
      calls++
      return n * 10
    })

    cachedFunction(1)
    cachedFunction(2)
    expect(calls).toBe(2)

    cachedFunction.clear()
    cachedFunction(1)
    cachedFunction(2)
    expect(calls).toBe(4) // both recomputed
  })

  it('should wipe the whole store on clear, affecting wrappers sharing that cache', () => {
    let callsA = 0
    let callsB = 0
    const sharedCache = {}
    const cachedA = cached(
      (n: number) => {
        callsA++
        return n
      },
      { cache: sharedCache, cacheKey: 'a' }
    )
    const cachedB = cached(
      (n: number) => {
        callsB++
        return n
      },
      { cache: sharedCache, cacheKey: 'b' }
    )

    cachedA(1)
    cachedB(1)
    expect(callsA).toBe(1)
    expect(callsB).toBe(1)

    // clear() empties the entire shared store, not just cachedA's entries
    cachedA.clear()
    cachedA(1)
    cachedB(1)
    expect(callsA).toBe(2)
    expect(callsB).toBe(2) // cachedB's entry was wiped too
  })

  describe('identity mode', () => {
    it('should keep distinct entries for structurally-equal distinct objects', () => {
      let calls = 0
      const cachedFunction = cached(
        (o: { id: number }) => {
          calls++
          return o.id
        },
        { mode: 'identity' }
      )

      // equal shape but distinct references -> distinct entries (unlike structural)
      expect(cachedFunction({ id: 1 })).toBe(1)
      expect(cachedFunction({ id: 1 })).toBe(1)
      expect(calls).toBe(2)
    })

    it('should evict an object entry only for the same reference', () => {
      let calls = 0
      const obj = { id: 1 }
      const cachedFunction = cached(
        (o: { id: number }) => {
          calls++
          return o.id
        },
        { mode: 'identity' }
      )

      expect(cachedFunction(obj)).toBe(1)
      expect(calls).toBe(1)

      // a structurally-equal but distinct reference does not target the entry
      cachedFunction.evict({ id: 1 })
      expect(cachedFunction(obj)).toBe(1)
      expect(calls).toBe(1) // still cached

      // the exact reference evicts it
      cachedFunction.evict(obj)
      expect(cachedFunction(obj)).toBe(1)
      expect(calls).toBe(2) // recomputed
    })
  })

  describe('structural mode', () => {
    it('should share one entry for structurally-equal distinct objects', () => {
      let calls = 0
      const cachedFunction = cached(
        (o: { id: number }) => {
          calls++
          return o.id
        },
        { mode: 'structural' }
      )

      // distinct references, equal shape -> single entry (unlike identity mode)
      expect(cachedFunction({ id: 1 })).toBe(1)
      expect(cachedFunction({ id: 1 })).toBe(1)
      expect(calls).toBe(1)
    })

    it('should keep distinct entries for structurally-different objects', () => {
      let calls = 0
      const cachedFunction = cached(
        (o: { id: number }) => {
          calls++
          return o.id
        },
        { mode: 'structural' }
      )

      expect(cachedFunction({ id: 1 })).toBe(1)
      expect(cachedFunction({ id: 2 })).toBe(2)
      expect(calls).toBe(2)
    })

    it('should evict by structural equality, not reference', () => {
      let calls = 0
      const cachedFunction = cached(
        (o: { id: number }) => {
          calls++
          return o.id
        },
        { mode: 'structural' }
      )

      expect(cachedFunction({ id: 1 })).toBe(1)
      expect(calls).toBe(1)

      // a different reference with the same shape evicts the entry in structural mode
      cachedFunction.evict({ id: 1 })
      expect(cachedFunction({ id: 1 })).toBe(1)
      expect(calls).toBe(2) // recomputed
    })

    it('should throw on object arguments JSON cannot represent (BigInt)', () => {
      const cachedFunction = cached((_o: object) => 0, { mode: 'structural' })
      // BigInt is the genuine "JSON cannot represent" case: canonicalization
      // leaves it in place and the outer JSON.stringify still throws.
      expect(() => cachedFunction({ n: 5n })).toThrow()
    })
  })

  describe('error handling', () => {
    it('should let the original error surface unchanged to the caller', () => {
      const boom = new Error('boom')
      const cachedFunction = cached(() => {
        throw boom
      })

      let caught: unknown
      try {
        cachedFunction()
      } catch (e) {
        caught = e
      }
      // the exact thrown error propagates; nothing wraps or swallows it
      expect(caught).toBe(boom)
    })

    it('should not cache a thrown error, so the next call retries', () => {
      let calls = 0
      const cachedFunction = cached((n: number) => {
        calls++
        if (calls === 1) throw new Error('transient')
        return n * 10
      })

      // first call throws and caches nothing
      expect(() => cachedFunction(1)).toThrow('transient')
      expect(calls).toBe(1)

      // second call recomputes rather than replaying the error, then caches
      expect(cachedFunction(1)).toBe(10)
      expect(cachedFunction(1)).toBe(10)
      expect(calls).toBe(2)
    })

    it('should surface a failed refresh instead of the stale value once the ttl elapses', () => {
      let now = 1000
      let calls = 0
      const cachedFunction = cached(
        () => {
          calls++
          if (calls === 2) throw new Error('refresh failed')
          return calls * 10
        },
        { ttlMs: 100, timeProvider: { now: () => now } }
      )

      expect(cachedFunction()).toBe(10)

      now = 1101 // ttl exceeded -> refresh is attempted and throws
      // the stale value is not served in place of the error
      expect(() => cachedFunction()).toThrow('refresh failed')
      expect(calls).toBe(2)

      // the failed refresh cached nothing new, so the next call retries and succeeds
      expect(cachedFunction()).toBe(30)
      expect(calls).toBe(3)
    })
  })

  describe('argument key injectivity', () => {
    it('should not collide multi-arg lists with a single arg containing the join delimiter', () => {
      let calls = 0
      const cachedFunction = cached((...args: string[]) => {
        calls++
        return args.join('|')
      })

      // two string args vs one string that embeds the old comma delimiter:
      // these historically collapsed onto one entry
      expect(cachedFunction('a', 'b')).toBe('a|b')
      expect(cachedFunction('a,b')).toBe('a,b')
      expect(calls).toBe(2)

      // and each retains its own value on the cached re-read
      expect(cachedFunction('a', 'b')).toBe('a|b')
      expect(cachedFunction('a,b')).toBe('a,b')
      expect(calls).toBe(2)
    })

    it('should not collide a number with its string form', () => {
      let calls = 0
      const cachedFunction = cached((a: unknown) => {
        calls++
        return `${typeof a}:${String(a)}`
      })

      expect(cachedFunction(1)).toBe('number:1')
      expect(cachedFunction('1')).toBe('string:1')
      expect(calls).toBe(2)

      expect(cachedFunction(1)).toBe('number:1')
      expect(cachedFunction('1')).toBe('string:1')
      expect(calls).toBe(2)
    })

    it('should not collide a boolean with its string form', () => {
      let calls = 0
      const cachedFunction = cached((a: unknown) => {
        calls++
        return `${typeof a}:${String(a)}`
      })

      expect(cachedFunction(true)).toBe('boolean:true')
      expect(cachedFunction('true')).toBe('string:true')
      expect(calls).toBe(2)
    })

    it('should not collide null with its string form', () => {
      let calls = 0
      const cachedFunction = cached((a: unknown) => {
        calls++
        return `${typeof a}:${String(a)}`
      })

      expect(cachedFunction(null)).toBe('object:null')
      expect(cachedFunction('null')).toBe('string:null')
      expect(calls).toBe(2)
    })

    it('should not collide undefined with its string form', () => {
      let calls = 0
      const cachedFunction = cached((a: unknown) => {
        calls++
        return `${typeof a}:${String(a)}`
      })

      expect(cachedFunction(undefined)).toBe('undefined:undefined')
      expect(cachedFunction('undefined')).toBe('string:undefined')
      expect(calls).toBe(2)
    })

    it('should not collide an identity-mode object id with an equal numeric primitive', () => {
      let calls = 0
      const cachedFunction = cached(
        (a: unknown) => {
          calls++
          return typeof a === 'object' ? 'from-object' : 'from-number'
        },
        { mode: 'identity' }
      )

      // a fresh object is keyed by an internal integer identity id; a numeric
      // primitive equal to that id must not land on the same entry
      expect(cachedFunction({})).toBe('from-object')
      expect(cachedFunction(1)).toBe('from-number')
      expect(calls).toBe(2)
    })

    it('should still share one entry for equal-shape distinct object refs in structural mode', () => {
      let calls = 0
      const cachedFunction = cached((o: { id: number }) => {
        calls++
        return o.id
      })

      // the injectivity fix must not over-fix: structurally-equal distinct
      // references still collapse to a single entry
      expect(cachedFunction({ id: 1 })).toBe(1)
      expect(cachedFunction({ id: 1 })).toBe(1)
      expect(calls).toBe(1)
    })
  })

  describe('structural mode key canonicalization', () => {
    it('should treat top-level property order as irrelevant', () => {
      let calls = 0
      const cachedFunction = cached((o: { a: number; b: number }) => {
        calls++
        return o.a + o.b
      })

      // structural mode is the default; the canonical key sorts properties so
      // insertion order cannot fork the entry
      expect(cachedFunction({ a: 1, b: 2 })).toBe(3)
      expect(cachedFunction({ b: 2, a: 1 })).toBe(3)
      expect(calls).toBe(1)
    })

    it('should treat nested property order as irrelevant', () => {
      let calls = 0
      const cachedFunction = cached(
        (o: { a: number; nested: { x: number; y: number } }) => {
          calls++
          return o.a + o.nested.x + o.nested.y
        }
      )

      // canonicalization recurses, so nested objects are sorted too
      expect(cachedFunction({ a: 1, nested: { x: 1, y: 2 } })).toBe(4)
      expect(cachedFunction({ nested: { y: 2, x: 1 }, a: 1 })).toBe(4)
      expect(calls).toBe(1)
    })

    it('should keep array order significant', () => {
      let calls = 0
      const cachedFunction = cached((xs: number[]) => {
        calls++
        return xs.join(',')
      })

      // sorting keys must not spill over into reordering array elements
      expect(cachedFunction([1, 2])).toBe('1,2')
      expect(cachedFunction([2, 1])).toBe('2,1')
      expect(calls).toBe(2)
    })

    it('should keep structurally-different objects distinct', () => {
      let calls = 0
      const cachedFunction = cached((o: { a: number }) => {
        calls++
        return o.a
      })

      // canonicalization must not collapse genuinely different values
      expect(cachedFunction({ a: 1 })).toBe(1)
      expect(cachedFunction({ a: 2 })).toBe(2)
      expect(calls).toBe(2)
    })

    it('should key Date arguments by value via toJSON', () => {
      let calls = 0
      const cachedFunction = cached((d: Date) => {
        calls++
        return d.getUTCFullYear()
      })

      // equal instants share one entry, a different instant is distinct
      // -> two computes across three calls
      expect(cachedFunction(new Date('2024-01-01'))).toBe(2024)
      expect(cachedFunction(new Date('2024-01-01'))).toBe(2024)
      expect(cachedFunction(new Date('2020-01-01'))).toBe(2020)
      expect(calls).toBe(2)
    })

    it('should cache a nested cyclic argument via the circular sentinel', () => {
      let calls = 0
      const cachedFunction = cached((o: { inner: { tag: number } }) => {
        calls++
        return o.inner.tag
      })

      const makeCyclic = () => {
        const inner: { tag: number; self?: unknown } = { tag: 7 }
        const outer = { inner }
        inner.self = outer // cycle reachable only through a nested property
        return outer
      }

      // a genuine back-reference is keyed as the circular sentinel rather than
      // throwing, so the cyclic arg computes and caches like any other value
      expect(cachedFunction(makeCyclic())).toBe(7)
      // a fresh, structurally-equal cyclic object hits the same entry
      expect(cachedFunction(makeCyclic())).toBe(7)
      expect(calls).toBe(1)
    })

    it('should cache a self-cyclic argument and share one entry for equal shapes', () => {
      let calls = 0
      const cachedFunction = cached((o: { id: number }) => {
        calls++
        return o.id
      })

      const makeSelfCyclic = (id: number) => {
        const node: { id: number; self?: unknown } = { id }
        node.self = node // direct back-reference to itself
        return node
      }

      // the self-reference becomes the circular sentinel; no throw
      expect(cachedFunction(makeSelfCyclic(1))).toBe(1)
      // a fresh but structurally-equal self-cyclic object is a cache hit
      expect(cachedFunction(makeSelfCyclic(1))).toBe(1)
      expect(calls).toBe(1)
    })

    it('should keep cyclic arguments distinct when non-cycle data differs', () => {
      let calls = 0
      const cachedFunction = cached((o: { id: number }) => {
        calls++
        return o.id
      })

      const makeSelfCyclic = (id: number) => {
        const node: { id: number; self?: unknown } = { id }
        node.self = node
        return node
      }

      // same cyclic shape, different payload -> distinct canonical keys
      expect(cachedFunction(makeSelfCyclic(1))).toBe(1)
      expect(cachedFunction(makeSelfCyclic(2))).toBe(2)
      expect(calls).toBe(2)
    })
  })
})
