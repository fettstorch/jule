import { describe, expect, it } from 'vitest'
import { sleep } from '../src/sleep'
import { synchronize } from '../src/synchronize'

describe('synchronize', () => {
  it('should queue function calls and respect call order over execution time', async () => {
    let val = 0
    const handler = async (v: number) => {
      await sleep(v)
      val = v
    }
    const syncHandler = synchronize(handler)
    await Promise.all([syncHandler(20), syncHandler(10)])
    expect(val).toEqual(10)
  })

  it('should allow different functions to be synchronized on the same lock', async () => {
    let val = 0
    const lock = {}
    const foo = () => {
      val = 1
    }
    const bar = async () => {
      await sleep(10)
      val = 2
    }
    const syncedFoo = synchronize(foo, lock)
    const syncedBar = synchronize(bar, lock)
    await Promise.all([syncedBar(), syncedFoo()])
    expect(val).toEqual(1)
  })
})
