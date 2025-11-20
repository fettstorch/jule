import { describe, expect, it } from "vitest"
import { retryable } from "../src/retryable"

describe('retryable', () => {
    it('should enable retrying', async () => {
        let tryCount = 0
        const result = retryable(({ retry }) => {
            if (++tryCount < 3) {
                retry()
            }
            return tryCount
        }, { backoffMs: 0 })
        expect(result).toEqual(3)
    })

    it('interrupts the handler on retry', () => {
        let tryCount = 0
        const result = retryable(({ retry }) => {
            if (++tryCount < 3) {
                retry()
                tryCount = 0 // should never be executed
            }
            return tryCount
        }, { backoffMs: 0 })
        expect(result).toEqual(3)
    })

    it('should provide the correct try count', () => {
        const tries: number[] = []
        retryable(({ retry, tryCount }) => {
            tries.push(tryCount)
            if (tryCount < 3) {
                retry()
            }
        }, { backoffMs: 0 })
        expect(tries).toEqual([1, 2, 3])
    })

    it('works with async handlers - case success', async () => {
        let tryCount = 0
        const result = await retryable(async ({ retry }) => {
            if (++tryCount < 3) {
                retry()
                tryCount = 0 // should never be executed
            }
            return tryCount
        }, { backoffMs: 0 }).catch(() => {})
        expect(result).toEqual(3)
    })

    it('works with async handlers - case failure', async () => {
        let tryCount = 0
        const result = await retryable(async ({ retry }) => {
            if (++tryCount < 1) {
                retry()
            }
            throw new Error('test')
        }, { backoffMs: 0 }).catch(() => 10) // 'test' error can be catched and handled
        expect(result).toEqual(10)
    })
})