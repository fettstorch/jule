import type { Func } from './types/Func'

/**
 * Debounce a function call.
 * @param fn - The function to debounce.
 * @param delayMillis - The delay in milliseconds to debounce the function call.
 * @param lock - The lock object to debounce the function call on.
 * If no lock object is given, the passed function will be used as lock.
 * @example
 * ```ts
 * const fn = () => console.log('fn')
 * debounce(fn, 1000)
 * debounce(fn, 1000) // will be executed only once after 1000ms
 * ```
 * In case you want different functions to debounce on the same timer,
 * you can pass an object as lock manually.
 * @example
 * ```ts
 * const lock = {}
 * const fn1 = () => console.log('fn1')
 * const fn2 = () => console.log('fn2')
 * debounce(fn1, 1000, lock)
 * debounce(fn2, 1000, lock) // only fn2 will be executed after 1000ms
 *
 * @returns an object with a clear function to cancel the debounce timer
 */
export function debounce<This, Args extends unknown[] = void[], Ret = void>(
  fn: Func<This, Args, Ret>,
  delayMillis?: number | undefined,
  lock: object = fn
) {
  if (!debouncers.has(lock)) {
    debouncers.set(lock, getDebouncer())
  }
  const { debounce } = debouncers.get(lock)!
  debounce(fn, delayMillis)
}

/**
 * Returns a function that debounces the given function call.
 * @param fn - The function to debounce.
 * @param delayMillis - The delay in milliseconds to debounce the function call.
 * @param lock - The lock object to debounce the function call on.
 * @see debounce
 * If you need manual control over stopping the debounce timer, @see getDebouncer.
 * @example
 * ```ts
 * const debouncedAction = debounced(action, 1000)
 * debouncedAction()
 * debouncedAction() // will log 'action' once after 1000ms
 * ```
 */
export function debounced<This, Args extends unknown[] = void[], Ret = void>(
  fn: Func<This, Args, Ret>,
  delayMillis?: number | undefined,
  lock: object = fn
) {
  return () => debounce(fn, delayMillis, lock)
}

/**
 * This util function returns a debounce function that can be used to debounce function calls.
 * Each debounce function that is returned will have its own timer handle.
 *
 * @returns an object with a debounce function and a clear function for
 * manually clearing without replacing the timer.
 */
export function getDebouncer() {
  let timerHandle: number | undefined

  return { debounce, clear: () => clearTimeout(timerHandle) }

  //--- function local internals

  function debounce<This, Args extends unknown[] = void[], Ret = void>(
    fn: Func<This, Args, Ret>,
    delayMillis?: number | undefined
  ) {
    clearTimeout(timerHandle)
    timerHandle = setTimeout(fn, delayMillis)
  }
}

/**
 * Method Decorator function to debounce a method call.
 * @param delayMillis the delay in milliseconds to debounce the method call
 * @example
 * ```ts
 * class Test {
 *    @Debounced(100)
 *    test() {
 *      console.log('debounced')
 *    }
 * }
 * const test = new Test()
 * test.test()
 * test.test()
 * // 'debounced' will be printed only once after 100ms
 * ```
 */
export function Debounced(delayMillis: number) {
  const { debounce } = getDebouncer()
  return <This, Args extends unknown[], Return>(
    originalMethod: (this: This, ...args: Args) => Return,
    _: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
  ) =>
    () =>
      debounce(originalMethod, delayMillis)
}

// --- module private

const debouncers = new WeakMap<object, ReturnType<typeof getDebouncer>>()
