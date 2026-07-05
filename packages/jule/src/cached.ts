import { Func } from './types/Func'

/**
 * Wraps a function so its result is computed lazily and then reused on
 * subsequent calls, until an eviction condition is met.
 *
 * Unlike {@link once}, the result is cached per distinct argument list, so
 * `cachedFn(1)` and `cachedFn(2)` are memoized independently. Primitive
 * arguments are always keyed by value; object arguments are keyed according
 * to `config.mode` (see below).
 *
 * @param originalFunction the function whose result should be cached. It is
 * invoked with the same `this` and arguments as the returned wrapper.
 * @param config optional configuration.
 * @param config.ttlMs time-to-live in milliseconds. A cached entry is reused
 * while `now - entry.updateTime <= ttlMs` and recomputed once that is
 * exceeded. Defaults to `Infinity` (never evicts by time).
 * @param config.cache external store to hold cached entries. Pass the same
 * object to multiple wrappers to deliberately share state between them.
 * Defaults to a fresh function-local cache, which keeps each wrapper — and
 * thus each class-field instance — isolated and free of namespace collisions.
 * @param config.cacheKey base key entries are stored under (combined with the
 * per-argument key). Give wrappers that share a `cache` distinct
 * `cacheKey`s to keep their entries separate. Defaults to a shared internal
 * symbol.
 * @param config.timeProvider source of the current time via `now()`, used for
 * ttl checks. Defaults to `Date`; inject a custom provider to control time in
 * tests.
 * @param config.mode how object arguments are keyed. `"structural"` (default)
 * keys them by `JSON.stringify`, so structurally-equal objects share one entry
 * (at the cost of throwing on values JSON cannot represent, e.g. cycles or
 * BigInt). `"identity"` keys them by reference, so two distinct objects never
 * collide but a fresh structurally-equal object is a new key.
 * @returns a function with the same signature as `originalFunction` that
 * returns the cached (or freshly computed) result.
 *
 * @remarks
 * Errors are not handled: if `originalFunction` throws, the error propagates
 * to the caller unchanged and nothing is written to the cache. Failures are
 * therefore never memoized — the next call retries. When a stale entry's
 * refresh (past `ttlMs`) throws, the error surfaces rather than the stale
 * value, and the entry is left untouched for the next call to retry.
 *
 * @example
 * const fetchUser = cached((id: number) => expensiveLookup(id))
 * fetchUser(1) // runs the lookup
 * fetchUser(1) // returns the cached result
 * fetchUser(2) // different argument -> runs the lookup again
 *
 * @example
 * // evict after a time-to-live
 * const stamp = cached(() => Date.now(), { ttlMs: 1000 })
 */
export function cached<
  This,
  TargetFunctionArgs extends unknown[] = void[],
  TargetFunctionReturnType = void
>(
  originalFunction: Func<This, TargetFunctionArgs, TargetFunctionReturnType>,
  config?: Partial<{
    ttlMs: number
    cache: Cache<TargetFunctionReturnType>
    cacheKey: PropertyKey
    timeProvider: { now: () => number }
    mode: Mode
  }>
) {
  // default is function local cache
  // this elegantly avoids namespace collisions
  const functionLocalCache: Cache<TargetFunctionReturnType> = {}

  const { ttlMs, cache, cacheKey, timeProvider, mode } = {
    ttlMs: Infinity,
    cache: functionLocalCache,
    cacheKey: defaultCacheKey,
    timeProvider: Date,
    mode: 'structural' as Mode,
    ...config
  }

  const cachedFunction = function (
    this: This,
    ...args: TargetFunctionArgs
  ): TargetFunctionReturnType {
    const key = createKey(args)

    const cachedValue = cache[key]

    const updateTime = timeProvider.now()

    const needsUpdate = !cachedValue || updateTime - cachedValue.updateTime > ttlMs

    if (needsUpdate) {
      cache[key] = {
        val: originalFunction.apply(this, args),
        updateTime
      }
    }

    return cache[key].val
  }

  cachedFunction.evict = function (...args: TargetFunctionArgs) {
    delete cache[createKey(args)]
  }

  cachedFunction.clear = function () {
    for (const key of Object.keys(cache)) {
      delete cache[key]
    }
  }

  return cachedFunction

  // --- key derivation (object args depend on config.mode) ---
  function createKey(args: unknown[]) {
    return `${String(cacheKey)}-${createArgsKey(args)}`
  }

  function createArgsKey(args: unknown[]) {
    return [...args]
      .map((a) => {
        if (!!a && typeof a === 'object') {
          return mode === 'identity' ? getUniqueIdentifierForObject(a) : JSON.stringify(a)
        }
        return String(a)
      })
      .join(',')
  }
}

//-- module private utility

// --- object identification ---
// for converting objects into identities
// this is in order to properly be able to distinguish different object args
// as different arguments. Otherwise stringifying objects is just "[Object object]"
const getUniqueIdentifierForObject = (() => {
  const objectArgMap = new WeakMap<object, number>()
  let objectIdentityCounter = 0
  return (o: object) => {
    let identity = objectArgMap.get(o)
    if (!identity) {
      identity = ++objectIdentityCounter
      objectArgMap.set(o, identity)
    }
    return identity
  }
})()

// --- caching ---
const defaultCacheKey = Symbol('jule-cached-function-util-deafult-cache-key')
type Cache<CachedValue> = Record<PropertyKey, { val: CachedValue; updateTime: number }>
type Mode = 'structural' | 'identity'
