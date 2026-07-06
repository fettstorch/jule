import { Func } from './types/Func'

/**
 * Wraps a function so its result is computed lazily and then reused on
 * subsequent calls, until an eviction condition is met.
 *
 * Unlike {@link once}, the result is cached per distinct argument list, so
 * `cachedFn(1)` and `cachedFn(2)` are memoized independently. Argument keys
 * are collision-free across types — `1`, `"1"`, and `true` never share an
 * entry — and object arguments are keyed according to `config.mode` (see
 * below).
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
 * keys them by their canonical JSON form: keys are sorted recursively so
 * property order is irrelevant (`{ a, b }` and `{ b, a }` share one entry),
 * while array order is significant and `toJSON` (e.g. `Date`) is honoured.
 * Cyclic back-references are keyed as a `"[circular reference]"` sentinel
 * rather than throwing, so cyclic arguments are cacheable; only values JSON
 * genuinely cannot represent (e.g. BigInt) still throw. `"identity"`
 * keys them by reference, so two distinct objects never collide but a fresh
 * structurally-equal object is a new key.
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
    // JSON-encode a per-argument [tag, ...payload] tuple. The tag makes the
    // scheme injective across types (`1`/`"1"`, `null`/`"null"`, an identity
    // id equal to a numeric arg all differ) and JSON handles the delimiting,
    // so a string arg can never forge a neighbouring entry. Objects are
    // embedded raw and serialized exactly once (no double-stringify).
    return JSON.stringify(args.map(argKeyTuple))
  }

  function argKeyTuple(a: unknown): unknown[] {
    switch (typeof a) {
      case 'string':
      case 'number':
      case 'boolean':
        return [typeof a, a]
      case 'undefined':
        return ['undefined']
      // bigint/symbol aren't JSON-serializable -> tag their string form
      case 'bigint':
      case 'symbol':
        return [typeof a, String(a)]
      // functions can't be structurally serialized -> always keyed by identity
      case 'function':
        return ['function', getUniqueIdentifierForObject(a as object)]
      default:
        if (a === null) return ['null']
        return mode === 'identity'
          ? ['object-id', getUniqueIdentifierForObject(a as object)]
          : ['object', canonicalize(a)]
    }
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

// sentinel substituted for a cyclic back-reference so cyclic args stay keyable
const CIRCULAR = '[circular reference]'

// --- structural canonicalization ---
// Recursively sorts object keys so structurally-equal objects share one cache
// key regardless of property insertion order; array order stays significant.
// `toJSON` (e.g. Date) is honoured like JSON.stringify. A DAG (a repeated
// non-cyclic reference) fully expands; a genuine back-reference to an ancestor
// still on the stack becomes a CIRCULAR sentinel instead of throwing, so
// cyclic args are keyable. Values JSON cannot represent (BigInt) are left to
// the outer JSON.stringify, which still throws.

function canonicalize(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || typeof value !== 'object') return value

  // resolve toJSON first, mirroring JSON.stringify's own traversal
  let node: object = value
  if ('toJSON' in value && typeof value.toJSON === 'function') {
    const json = value.toJSON()
    if (json === null || typeof json !== 'object') return json
    node = json
  }

  if (seen.has(node)) {
    return CIRCULAR
  }
  seen.add(node)
  const canonical = Array.isArray(node)
    ? node.map((element) => canonicalize(element, seen))
    : Object.entries(node)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .reduce<Record<string, unknown>>((acc, [key, val]) => {
          acc[key] = canonicalize(val, seen)
          return acc
        }, {})
  seen.delete(node)
  return canonical
}

// --- caching ---
const defaultCacheKey = Symbol('jule-cached-function-util-deafult-cache-key')
type Cache<CachedValue> = Record<PropertyKey, { val: CachedValue; updateTime: number }>
type Mode = 'structural' | 'identity'
