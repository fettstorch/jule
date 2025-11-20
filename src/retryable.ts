import { sleep } from "./sleep";

/**
 * 
 * Allows to execute a function that might fail.
 * The given handler will get access to a retry function that can be used to retry the given function.
 * The given handler will also get the current try count.
 * 
 * @example
 * ```ts
 * const result = retryable(({ retry, tryCount }) => {
 *     const result = doSomething()
 *     if (result.error === someCondition) {
 *         console.log(`try ${tryCount}`)
 *         retry()
 *         // no code beneath retry will be executed
 *     }
 * })
 * ```
 * @param handler the function to execute that might fail
 * @param config the configuration for the retryable function
 * @param config.backoffMs the initial backoff in milliseconds
 * @param config.backoffIncrease the function to increase the backoff
 * @returns the result of the function
 */
export function retryable<T>(
    handler: (context: { retry: (cause?: Error['cause']) => never; tryCount: number }) => T,
    {
        backoffMs = 200,
        backoffIncrease = (backoffMs: number) => backoffMs * backoffMs
    }: {
        backoffMs?: number
        backoffIncrease?: (backoffMs: number) => number
    } = {}
): T {
    function retry(cause?: Error['cause']): never {
        throw new Error('retry', { cause })
    }

    function isRetryable(error: unknown): boolean {
        return error instanceof Error && error.message === 'retry'
    }

    function withRetry(tryCount: number, { backoffMs, backoffIncrease }: { backoffMs: number, backoffIncrease: (backoffMs: number) => number }): T {
        try {
            const result = handler({
                retry,
                tryCount,
            })

            // case result is a promise
            if (result instanceof Promise) {
                return result.catch((error) => {
                    if (isRetryable(error)) {
                        return sleep(backoffMs).then(() => withRetry(tryCount + 1, { backoffMs: backoffIncrease(backoffMs), backoffIncrease }))
                    }
                    return Promise.reject(error)
                }) as T
            }

            // case not a promise
            return result
        } catch (error: unknown) {
            if (isRetryable(error)) {
                return withRetry(tryCount + 1, { backoffMs: backoffIncrease(backoffMs), backoffIncrease })
            }
            throw error
        }
    }

    return withRetry(1, { backoffMs, backoffIncrease })
}