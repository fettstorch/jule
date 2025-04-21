type Resolve<T> = Parameters<ConstructorParameters<typeof Promise<T>>[0]>[0]
export type Awaitable<T = void> = Promise<T> &
  Readonly<{
    resolve: Resolve<T>
    reject: (reason: unknown) => void
  }>

export type Subject<T = void> = Awaitable<T> &
  Readonly<{
    status: () => 'pending' | 'resolved' | 'rejected'
  }>

/** Creates a promise and provides resolve and reject functions for
 * manually invoking the promise.
 * @example
 * ```ts
 * const promise = awaitable<number>()
 * promise.then((val) => {
 *   expect(val).toBe(1)
 * })
 * promise.resolve(1)
 * ```
 */
export function awaitable<T = void>(): Awaitable<T> {
  let resolveFn, rejectFn

  const promise: Promise<T> = new Promise<T>((resolve, reject) => {
    resolveFn = resolve
    rejectFn = reject
  })

  return {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
    resolve: resolveFn!,
    reject: rejectFn!,
    [Symbol.toStringTag]: 'Awaitable'
  }
}

/** Creates a promise and provides resolve and reject functions for
 * manually invoking the promise, as well as a status function to check
 * the status of the promise.
 * @example
 * ```ts
 * const s = subject<number>()
 * s.then(() => {
 *   expect(s.status()).toBe('resolved')
 * })
 * s.resolve(1)
 * await s
 * ```
 */
export function subject<T = void>(): Subject<T> {
  const promise = awaitable<T>()
  let status: 'resolved' | 'rejected' | undefined

  const resolve = ((val: T | PromiseLike<T>) => {
    status ??= 'resolved'
    promise.resolve(val)
  }) as Resolve<T>

  return {
    ...promise,
    status: () => status ?? 'pending',
    resolve,
    reject(reason: unknown) {
      status ??= 'rejected'
      promise.reject(reason)
    }
  }
}
