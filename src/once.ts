import type { Func } from './types/Func'
/**
 * Function that creates a function from a given function and prevents multiple executions by caching the first result.
 * @param fn the function to be executed only once
 */
export function once<This, Args extends unknown[] = void[], Ret = void>(fn: Func<This, Args, Ret>) {
  const localFunctionCache = {}
  return _once(fn, { cache: localFunctionCache })
}

/**
 * Decorator function to make a getter cache its result, so it is executed only once
 */
export function Once<This, Return>(
  originalMethod: Func<This, void[], Return>,
  context: ClassGetterDecoratorContext<This, Return>
) {
  const cacheKey = `${String(defaultCacheKey)}-${String(context.name)}`
  return _once<This, void[], Return>(originalMethod, { cacheKey })
}

//--- module private utility

/**
 * Function that creates a function from a given function and prevents multiple executions by caching the first result.
 * @param fn the function to be executed only once.
 * @param config configuration object
 * @param config.cacheKey key used to internally access the cached value, defaults to a generic symbol.
 * @param config.cache external cache to hold the cached value.
 * If not given, the cache will be linked to the 'this' instance if one is present and
 * ultimately will default to a function local cache.
 */
function _once<
  This,
  TargetFunctionArgs extends unknown[] = void[],
  TargetFunctionReturnType = void
>(
  fn: Func<This, TargetFunctionArgs, TargetFunctionReturnType>,
  config?: {
    cacheKey?: PropertyKey
    cache?: Cache<TargetFunctionReturnType>
  }
) {
  const functionLocalCache = {}
  return function (this: This, ...args: TargetFunctionArgs): TargetFunctionReturnType {
    const { cacheKey, cache } = {
      cacheKey: defaultCacheKey,
      cache: (this ?? functionLocalCache) as Cache<TargetFunctionReturnType>,
      ...config
    }

    if (!(cacheKey in cache)) {
      cache[cacheKey] = fn.apply(this, args)
    }

    return cache[cacheKey]!
  }
}

const defaultCacheKey = Symbol('once-function-util-default-cache-key')
type Cache<Ret> = Record<PropertyKey, Ret>
