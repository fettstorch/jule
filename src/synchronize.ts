import { promiseQueue } from './promise'
import type { Func } from './types/Func'

/**
 * @param action - function to synchronize
 * @param lock - object to use as a lock - defaults to the action function
 * @returns a function that will execute the given function in order
 * In case a lock is provided, the internally created queue will be cleaned up
 * when the lock is no longer referenced (weak reference)
 *
 * @example
 * ```typescript
 * let val = 0
 * const lock = {}
 * const foo = () => { val = 1}
 * const bar = () => { sleep(1000); val = 2}
 * const syncedFoo = synchronize(foo, lock)
 * const syncedBar = synchronize(bar, lock)
 *
 * syncedBar()
 * syncedFoo()
 *
 * console.log(val) // 1
 * ```
 */
export function synchronize<This, Args extends unknown[] = void[], Return = void>(
  action: Func<This, Args, Return>,
  lock: object = action
) {
  if (!queues.has(lock)) {
    queues.set(lock, promiseQueue<Return>().enqueue)
  }

  const enqueue = queues.get(lock)!

  return function (this: This, ...args: Args): Promise<Return> {
    return enqueue(() => action.apply(this, args))
  }
}

// --- module private

const queues = new WeakMap<
  object | (() => unknown),
  ReturnType<typeof promiseQueue<any>>['enqueue']
>()
