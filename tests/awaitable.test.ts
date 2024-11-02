import { describe, expect, it } from 'vitest'
import { awaitable, subject } from '../src/awaitable'

describe('Awaitable', () => {
  it('should resolve', async () => {
    const { promise, resolve } = awaitable<number>()
    promise.then((a) => {
      expect(a).toBe(1)
    })
    resolve(1)
  })

  it('should reject', () => {
    const { promise, reject } = awaitable()
    promise.catch((e) => {
      expect(e).toBe('error')
    })
    reject('error')
  })
})

describe('Subject', () => {
  describe('status', () => {
    it('should be pending initially', () => {
      const { status } = subject<number>()
      expect(status()).toBe('pending')
    })

    it('should be resolved when promise resolves', async () => {
      const { status, promise, resolve } = subject()
      resolve()
      await promise
      expect(status()).toBe('resolved')
    })

    it('should be rejected when promise rejects', async () => {
      const { status, promise, reject } = subject()
      reject('error')
      await promise.catch(() => {})
      expect(status()).toBe('rejected')
    })
  })
})
