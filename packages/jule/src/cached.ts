import { Func } from './types/Func'

/**
 * Wraps a function so its result is computed lazily and then reused on
 * subsequent calls, until an eviction condition is met.
 *
 * Unlike {@link once}, the result is cached per distinct argument list, so
 * `cachedFn(1)` and `cachedFn(2)` are memoized independently. Argument keys
 * are collision-free across types — `1`, `"1"`, and `true` never share an
 * entry — and object arguments are keyed according to
 * `config.objectArgFingerprintStrategy` (see below).
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
 * @param config.objectArgFingerprintStrategy how object arguments are
 * fingerprinted into a cache key. `"structural"` (default)
 * keys them by a tagged canonical form: keys are sorted recursively so
 * property order is irrelevant (`{ a, b }` and `{ b, a }` share one entry),
 * while array order is significant and `toJSON` (e.g. `Date`) is honoured.
 * Cyclic back-references are keyed as a `"[circular reference]"` sentinel
 * rather than throwing, so cyclic arguments are cacheable. Every value is
 * tagged by type at every depth, so keying is total and never throws: values
 * JSON cannot natively represent (BigInt, non-finite numbers, `undefined`
 * properties) are keyed distinctly rather than collapsing or erroring.
 * `"identity"` keys objects by reference, so two distinct objects never collide
 * but a fresh structurally-equal object is a new key.
 * @returns a function with the same signature as `originalFunction` that
 * returns the cached (or freshly computed) result.
 *
 * @remarks
 * `cached` is synchronous and not promise-aware: it stores whatever
 * `originalFunction` returns, verbatim. If it throws synchronously the error
 * propagates to the caller and nothing is written to the cache, so a
 * synchronous failure is never memoized — the next call retries. When a stale
 * entry's refresh (past `ttlMs`) throws, the error surfaces rather than the
 * stale value, and the entry is left untouched for the next call to retry.
 *
 * @remarks
 * For an async `originalFunction` the cached value is the returned promise,
 * not its resolved value — including a rejected one. `cached` does not unwrap
 * or inspect it, so a rejection is cached like any other result and replayed
 * on every hit; use the returned wrapper's `.evict(...args)` (or `.clear()`)
 * to discard it and retry, applying whatever retry policy the cache cannot
 * know about.
 * `ttlMs` is measured from when the wrapper is invoked, not from when the
 * promise settles, so keep `ttlMs` at least as large as the expected
 * operation latency — otherwise the entry can expire mid-flight and each call
 * starts another operation. As a useful consequence of caching the pending
 * promise, concurrent callers within one ttl window share a single in-flight
 * operation (request de-duplication).
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
    objectArgFingerprintStrategy: ObjectArgFingerprintStrategy
  }>
) {
  const configDefaults: {
    ttlMs: number
    cache: Cache<TargetFunctionReturnType>
    cacheKey: PropertyKey
    timeProvider: { now: () => number }
    objectArgFingerprintStrategy: ObjectArgFingerprintStrategy
  } = {
    ttlMs: Infinity,
    cache: {},
    cacheKey: defaultCacheKey,
    timeProvider: Date,
    objectArgFingerprintStrategy: 'structural'
  }

  const {
    ttlMs,
    cache,
    cacheKey,
    timeProvider,
    objectArgFingerprintStrategy: strategy
  } = { ...configDefaults, ...config }

  // the function that will be returned by the wrapper
  const cachedFunction = function (
    this: This,
    ...args: TargetFunctionArgs
  ): TargetFunctionReturnType {
    const key = createKey(args, cacheKey, strategy)

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
    delete cache[createKey(args, cacheKey, strategy)]
  }

  cachedFunction.clear = function () {
    for (const key of Object.keys(cache)) {
      delete cache[key]
    }
  }

  return cachedFunction
}

//-- module private utility

// --- key derivation (object args depend on the fingerprint strategy) ---
// Each argument is turned into a fully-tagged, JSON-serializable fragment by
// `canonicalKey`, then the whole list is serialized once. Tagging every value
// at every depth makes the scheme injective (`1`/`"1"`, `null`/`"null"`,
// non-finite numbers, an identity id equal to a numeric arg all differ) and
// JSON handles the delimiting, so no argument can forge a neighbouring entry.
function createKey(
  args: unknown[],
  cacheKey: PropertyKey,
  strategy: ObjectArgFingerprintStrategy
): string {
  return `${String(cacheKey)}-${JSON.stringify(args.map((a) => canonicalKey(a, strategy)))}`
}

// --- object identification ---
// for converting objects into identities
// this is in order to properly be able to distinguish different object args
// as different arguments. Otherwise stringifying objects is just "[Object object]"
const getUniqueIdentifierForObject = (() => {
  const objectArgMap = new WeakMap<object, number>()
  let objectIdentityCounter = 0
  return (o: object) => {
    if (!objectArgMap.has(o)) {
      objectArgMap.set(o, ++objectIdentityCounter)
    }
    return objectArgMap.get(o)!
  }
})()

// sentinel substituted for a cyclic back-reference so cyclic args stay keyable
const CIRCULAR = '[circular reference]'

// --- canonical key derivation ---
// Turns any value into an injective, JSON-serializable key fragment by tagging
// it with its type at every depth. Primitives become `[type, payload]` tuples
// (non-finite numbers, bigint and symbol are tagged by their string form, so
// keying never throws). In structural mode objects become sorted `['object',
// entries]` tuples — property order is irrelevant while array order stays
// significant — and `toJSON` (e.g. Date) is honoured like JSON.stringify. A DAG
// (a repeated non-cyclic reference) fully expands; a genuine back-reference to
// an ancestor still on the stack becomes the CIRCULAR sentinel instead of
// throwing. Under the `"identity"` strategy objects are keyed by a stable
// reference id.
function canonicalKey(
  value: unknown,
  strategy: ObjectArgFingerprintStrategy,
  seen: WeakSet<object> = new WeakSet()
): unknown {
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return [typeof value, value]
    case 'number':
      // non-finite numbers serialize to `null` under raw JSON -> tag their
      // (distinct) string form so NaN/Infinity/-Infinity stay injective
      return ['number', Number.isFinite(value) ? value : String(value)]
    case 'undefined':
      return ['undefined']
    case 'bigint':
    case 'symbol':
      return [typeof value, String(value)]
    // functions can't be structurally serialized -> always keyed by identity
    case 'function':
      return ['function', getUniqueIdentifierForObject(value)]
    default: {
      if (value === null) return ['null']
      // typeof-narrowing an `unknown` default branch can't reach `object`, so
      // pin it once here rather than casting at every use
      const obj = value as object
      return strategy === 'identity'
        ? ['object-id', getUniqueIdentifierForObject(obj)]
        : canonicalStructural(obj, seen)
    }
  }
}

function canonicalStructural(value: object, seen: WeakSet<object>): unknown {
  // resolve toJSON first, mirroring JSON.stringify's own traversal
  let node: object = value
  if ('toJSON' in value && typeof value.toJSON === 'function') {
    const json = value.toJSON()
    // toJSON may yield a primitive (Date -> string); re-tag it so nested and
    // top-level values follow the same rules
    if (json === null || typeof json !== 'object') return canonicalKey(json, 'structural', seen)
    node = json
  }

  if (seen.has(node)) return CIRCULAR
  seen.add(node)
  const canonical = Array.isArray(node)
    ? ['array', node.map((element) => canonicalKey(element, 'structural', seen))]
    : [
        'object',
        Object.entries(node)
          .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
          .map(([key, val]) => [key, canonicalKey(val, 'structural', seen)])
      ]
  seen.delete(node)
  return canonical
}

// --- caching ---
const defaultCacheKey = Symbol('jule-cached-function-util-default-cache-key')
type Cache<CachedValue> = Record<string, { val: CachedValue; updateTime: number }>
type ObjectArgFingerprintStrategy = 'structural' | 'identity'
