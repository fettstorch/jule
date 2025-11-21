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
 *         retry({ backoffMs: 250 })
 *         // no code beneath retry will be executed
 *     }
 * })
 * ```
 * @param handler the function to execute that might fail
 * @param handler.tryCount the current try count
 * @param handler.retry the function to initiate a retry
 * @param handler.retry.backoffMs the backoff in milliseconds
 * @param handler.retry.cause the cause of the retry
 *
 * @returns the result of the function
 */
export function retryable<T>(handler: (context: { retry: RetryCommand; tryCount: number }) => T): T {
    function withRetry(tryCount: number): T {
        try {
            const result = handler({
                retry: ({ backoffMs }) => {
                    throw new Retry(backoffMs)
                },
                tryCount,
            })

            // case result is a promise
            if (result instanceof Promise) {
                return result.catch((error) => {
                    if (isRetryable(error)) {
                        return sleep(error.backoffMs).then(() => withRetry(tryCount + 1))
                    }
                    return Promise.reject(error)
                }) as T
            }

            // case not a promise
            return result
        } catch (error: unknown) {
            if (isRetryable(error)) {
                return withRetry(tryCount + 1)
            }
            throw error
        }
    }

    return withRetry(1)
}

//--- module private

type RetryCommand = (args: { backoffMs: number }) => never

function isRetryable(error: unknown): error is Retry {
    return error instanceof Retry
}

class Retry extends Error {
    constructor(readonly backoffMs: number) {
        super('retry')
        Object.setPrototypeOf(this, Retry.prototype)
    }
}
