/**
 * Creates a promise queue that will execute promises in order.
 * @example
 * ```ts
 * const { enqueue } = promiseQueue()
 * ```
 */
export function promiseQueue<T = void>() {
  let queue: Promise<T> = Promise.resolve(undefined as T)

  return {
    queue,
    enqueue
  }

  function enqueue(action: () => T): Promise<T> {
    const newPromise = queue.then(action)
    queue = newPromise.catch(() => {}) as Promise<T>
    return newPromise
  }
}
