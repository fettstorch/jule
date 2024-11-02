export type Awaitable<T = void> = Readonly<{
  promise: Promise<T>
  resolve: (val?: T | PromiseLike<T>) => void
  reject: (reason: unknown) => void
}>

/** Creates a promise and provides resolve and reject functions for
 * manually invoking the promise.
 * @example
 * ```ts
 * const { promise, resolve } = awaitable<number>()
 * promise.then((val) => {
 *   expect(val).toBe(1)
 * })
 * resolve(1)
 * ```
 */
export function awaitable<T = void>(): Awaitable<T> {
  let resolve, reject
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return {
    promise,
    resolve: resolve!,
    reject: reject!
  }
}

/** Creates a promise and provides resolve and reject functions for
 * manually invoking the promise, as well as a status function to check
 * the status of the promise.
 * @example
 * ```ts
 * const { promise, resolve, status } = subject<number>()
 * resolve(1).then(() => {
 *   expect(status()).toBe('resolved')
 * })
 * ```
 */
export function subject<T>(): Awaitable<T> &
  Readonly<{
    status: () => 'pending' | 'resolved' | 'rejected'
  }> {
  let status: 'pending' | 'resolved' | 'rejected' = 'pending'
  const { promise, resolve, reject } = awaitable<T>()

  return {
    promise,
    resolve(val) {
      status = 'resolved'
      resolve(val)
    },
    reject(reason: unknown) {
      status = 'rejected'
      reject(reason)
    },
    status: () => status
  }
}
