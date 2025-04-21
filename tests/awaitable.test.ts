import { describe, expect, it } from 'vitest'
import { awaitable, subject } from '../src/awaitable'

describe('Awaitable', () => {
  it('should resolve', async () => {
    const promise = awaitable<number>()
    promise.then((a) => {
      expect(a).toBe(1)
    })
    promise.resolve(1)
  })

  it('should reject', () => {
    const promise = awaitable()
    promise.catch((e) => {
      expect(e).toBe('error')
    })
    promise.reject('error')
  })
})

describe('Subject', () => {
  describe('status', () => {
    it('should be pending initially', () => {
      const { status } = subject<number>()
      expect(status()).toBe('pending')
    })

    it('should be resolved when promise resolves', async () => {
      const { status, resolve } = subject()
      resolve()
      await subject()
      expect(status()).toBe('resolved')
    })

    it('should be rejected when promise rejects', async () => {
      const { status, reject } = subject()
      reject('error')
      await subject()
      expect(status()).toBe('rejected')
    })
  })
})
