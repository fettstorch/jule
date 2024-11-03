import type { Func } from './types/Func'

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
