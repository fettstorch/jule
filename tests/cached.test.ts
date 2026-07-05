import { describe, expect, it } from "vitest";
import { cached } from "../src/cached";

describe("cached", () => {
  it("should only compute once when no eviction condition is met", () => {
    let a = 0;
    const originalFunction = (b: number) => b + ++a;
    const cachedFunction = cached(originalFunction);

    const resultOne = cachedFunction(1);
    const resultTwo = cachedFunction(1);
    const resultThree = cachedFunction(2);
    const resultFour = cachedFunction(2);

    expect(a).toBe(2);
    expect(resultOne).toBe(2);
    expect(resultTwo).toBe(resultOne);
    expect(resultThree).toBe(4);
    expect(resultFour).toBe(resultThree);
  });

  it("should keep exact return values and not reduce null to undefined", () => {
    const cachedReturningNull = cached(() => null);
    const cachedReturningUndefined = cached(() => undefined);
    expect(cachedReturningNull()).toEqual(null);
    expect(cachedReturningUndefined()).toEqual(undefined);
  });

  it("should return undefined as cached value for an original void returning function", () => {
    const cachedReturningVoid = cached(() => {});
    expect(cachedReturningVoid()).toEqual(undefined);
  });

  it("should only ever execute a function once", () => {
    let counter = 0;
    const originalFunction = () => {
      counter++;
    };
    const cachedFunction = cached(originalFunction);
    cachedFunction();
    cachedFunction();
    cachedFunction();
    cachedFunction();
    expect(counter).toEqual(1);
  });

  it("should cache independently for different arguments", () => {
    let calls = 0;
    const cachedFunction = cached((n: number) => {
      calls++;
      return n * 2;
    });

    expect(cachedFunction(2)).toBe(4);
    expect(cachedFunction(3)).toBe(6);
    expect(cachedFunction(2)).toBe(4);
    expect(cachedFunction(3)).toBe(6);
    expect(calls).toBe(2);
  });

  it("should not create shared state in- and between instances", () => {
    class TestClass {
      constructor(public readonly data: number) {}
      foo = cached(() => this.data);
      bar = cached(() => this.data + 1);
    }

    const testInstance1 = new TestClass(1);
    const testInstance2 = new TestClass(2);

    expect(testInstance1.foo()).toEqual(1);
    expect(testInstance1.bar()).toEqual(2);

    expect(testInstance2.foo()).toEqual(2);
    expect(testInstance2.bar()).toEqual(3);
  });

  it("should recompute the value once the ttl has elapsed", () => {
    let now = 1000;
    let calls = 0;
    const cachedFunction = cached(
      () => {
        calls++;
        return calls * 10;
      },
      { ttlMs: 100, timeProvider: { now: () => now } },
    );

    expect(cachedFunction()).toBe(10);

    now = 1100; // exactly at the ttl boundary: still fresh (needs to be strictly greater)
    expect(cachedFunction()).toBe(10);
    expect(calls).toBe(1);

    now = 1101; // ttl exceeded -> recompute
    expect(cachedFunction()).toBe(20);
    expect(calls).toBe(2);
  });

  it("should not share a cache between wrappers over the same function reference", () => {
    let calls = 0;
    const originalFunction = (n: number) => {
      calls++;
      return n * 10;
    };

    const cachedA = cached(originalFunction);
    const cachedB = cached(originalFunction);

    expect(cachedA(1)).toBe(10);
    expect(cachedB(1)).toBe(10);

    // each wrapper owns an independent cache, so the shared reference is
    // computed once per wrapper rather than once in total
    expect(calls).toBe(2);
  });

  it("should share state across wrappers when an explicit cache is passed", () => {
    let calls = 0;
    const sharedCache = {};
    const compute = (n: number) => {
      calls++;
      return n * 10;
    };

    const cachedA = cached(compute, { cache: sharedCache });
    const cachedB = cached(compute, { cache: sharedCache });

    expect(cachedA(1)).toBe(10);
    // cachedB reads cachedA's entry from the shared cache -> no recompute
    expect(cachedB(1)).toBe(10);
    expect(calls).toBe(1);

    // a different argument is a different key, so it computes once and is then
    // visible to the other wrapper as well
    expect(cachedB(2)).toBe(20);
    expect(cachedA(2)).toBe(20);
    expect(calls).toBe(2);
  });

  it("should isolate wrappers sharing a cache when they use distinct cacheKeys", () => {
    let calls = 0;
    const sharedCache = {};
    const compute = (n: number) => {
      calls++;
      return n * 10;
    };

    const cachedA = cached(compute, { cache: sharedCache, cacheKey: "a" });
    const cachedB = cached(compute, { cache: sharedCache, cacheKey: "b" });

    expect(cachedA(1)).toBe(10);
    // same cache, but the distinct cacheKey keeps the entries separate
    expect(cachedB(1)).toBe(10);
    expect(calls).toBe(2);
  });

  it("should key the cache on the full argument list for multi-arg functions", () => {
    let calls = 0;
    const cachedFunction = cached((a: number, b: number) => {
      calls++;
      return a * b;
    });

    expect(cachedFunction(2, 3)).toBe(6);
    expect(cachedFunction(2, 3)).toBe(6); // same args -> cached, no recompute
    expect(calls).toBe(1);

    // a change in any argument is a distinct key -> recompute
    expect(cachedFunction(3, 2)).toBe(6);
    expect(cachedFunction(2, 4)).toBe(8);
    expect(calls).toBe(3);
  });

  it("should treat distinct object arguments as distinct cache keys", () => {
    let calls = 0;
    const cachedFunction = cached((o: { id: number }) => {
      calls++;
      return o.id;
    });

    expect(cachedFunction({ id: 1 })).toBe(1);
    // a structurally different object must not hit the previous entry
    expect(cachedFunction({ id: 2 })).toBe(2);
    expect(calls).toBe(2);
  });

  it("should recompute an evicted entry on the next call", () => {
    let calls = 0;
    const cachedFunction = cached((n: number) => {
      calls++;
      return n * 10;
    });

    expect(cachedFunction(1)).toBe(10);
    expect(cachedFunction(1)).toBe(10);
    expect(calls).toBe(1);

    cachedFunction.evict(1);
    expect(cachedFunction(1)).toBe(10);
    expect(calls).toBe(2); // recomputed after eviction
  });

  it("should only evict the targeted argument entry", () => {
    let calls = 0;
    const cachedFunction = cached((n: number) => {
      calls++;
      return n * 10;
    });

    cachedFunction(1);
    cachedFunction(2);
    expect(calls).toBe(2);

    cachedFunction.evict(1);
    cachedFunction(1); // recomputes
    cachedFunction(2); // still cached
    expect(calls).toBe(3);
  });

  it("should treat evicting a non-existent entry as a no-op", () => {
    let calls = 0;
    const cachedFunction = cached((n: number) => {
      calls++;
      return n * 10;
    });

    expect(() => cachedFunction.evict(42)).not.toThrow();
    expect(cachedFunction(1)).toBe(10);
    expect(calls).toBe(1);
  });

  it("should recompute every entry after clear", () => {
    let calls = 0;
    const cachedFunction = cached((n: number) => {
      calls++;
      return n * 10;
    });

    cachedFunction(1);
    cachedFunction(2);
    expect(calls).toBe(2);

    cachedFunction.clear();
    cachedFunction(1);
    cachedFunction(2);
    expect(calls).toBe(4); // both recomputed
  });

  it("should wipe the whole store on clear, affecting wrappers sharing that cache", () => {
    let callsA = 0;
    let callsB = 0;
    const sharedCache = {};
    const cachedA = cached(
      (n: number) => {
        callsA++;
        return n;
      },
      { cache: sharedCache, cacheKey: "a" },
    );
    const cachedB = cached(
      (n: number) => {
        callsB++;
        return n;
      },
      { cache: sharedCache, cacheKey: "b" },
    );

    cachedA(1);
    cachedB(1);
    expect(callsA).toBe(1);
    expect(callsB).toBe(1);

    // clear() empties the entire shared store, not just cachedA's entries
    cachedA.clear();
    cachedA(1);
    cachedB(1);
    expect(callsA).toBe(2);
    expect(callsB).toBe(2); // cachedB's entry was wiped too
  });

  describe("identity mode", () => {
    it("should keep distinct entries for structurally-equal distinct objects", () => {
      let calls = 0;
      const cachedFunction = cached(
        (o: { id: number }) => {
          calls++;
          return o.id;
        },
        { mode: "identity" },
      );

      // equal shape but distinct references -> distinct entries (unlike structural)
      expect(cachedFunction({ id: 1 })).toBe(1);
      expect(cachedFunction({ id: 1 })).toBe(1);
      expect(calls).toBe(2);
    });

    it("should evict an object entry only for the same reference", () => {
      let calls = 0;
      const obj = { id: 1 };
      const cachedFunction = cached(
        (o: { id: number }) => {
          calls++;
          return o.id;
        },
        { mode: "identity" },
      );

      expect(cachedFunction(obj)).toBe(1);
      expect(calls).toBe(1);

      // a structurally-equal but distinct reference does not target the entry
      cachedFunction.evict({ id: 1 });
      expect(cachedFunction(obj)).toBe(1);
      expect(calls).toBe(1); // still cached

      // the exact reference evicts it
      cachedFunction.evict(obj);
      expect(cachedFunction(obj)).toBe(1);
      expect(calls).toBe(2); // recomputed
    });
  });

  describe("structural mode", () => {
    it("should share one entry for structurally-equal distinct objects", () => {
      let calls = 0;
      const cachedFunction = cached(
        (o: { id: number }) => {
          calls++;
          return o.id;
        },
        { mode: "structural" },
      );

      // distinct references, equal shape -> single entry (unlike identity mode)
      expect(cachedFunction({ id: 1 })).toBe(1);
      expect(cachedFunction({ id: 1 })).toBe(1);
      expect(calls).toBe(1);
    });

    it("should keep distinct entries for structurally-different objects", () => {
      let calls = 0;
      const cachedFunction = cached(
        (o: { id: number }) => {
          calls++;
          return o.id;
        },
        { mode: "structural" },
      );

      expect(cachedFunction({ id: 1 })).toBe(1);
      expect(cachedFunction({ id: 2 })).toBe(2);
      expect(calls).toBe(2);
    });

    it("should evict by structural equality, not reference", () => {
      let calls = 0;
      const cachedFunction = cached(
        (o: { id: number }) => {
          calls++;
          return o.id;
        },
        { mode: "structural" },
      );

      expect(cachedFunction({ id: 1 })).toBe(1);
      expect(calls).toBe(1);

      // a different reference with the same shape evicts the entry in structural mode
      cachedFunction.evict({ id: 1 });
      expect(cachedFunction({ id: 1 })).toBe(1);
      expect(calls).toBe(2); // recomputed
    });

    it("should throw on object arguments JSON cannot represent", () => {
      const cachedFunction = cached((_o: object) => 0, { mode: "structural" });
      const circular: { self?: unknown } = {};
      circular.self = circular;
      expect(() => cachedFunction(circular)).toThrow();
    });
  });
});
