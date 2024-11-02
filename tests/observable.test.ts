import { describe, expect, it } from 'vitest'
import { Observable } from '../src/observable'

describe('Observable', () => {
  it('removes callbacks correctly', () => {
    const sut = new Observable()
    const resultQueue: number[] = []
    const handle = () => resultQueue.push(1)
    sut.subscribe(handle)
    sut.unsubscribe(handle)
    sut.emit()
    expect(resultQueue).toEqual([])
  })
  it('prevents one callback to be registered multiple times', () => {
    const sut = new Observable()
    const resultQueue: number[] = []
    const handle = () => resultQueue.push(1)
    sut.subscribe(handle)
    sut.subscribe(handle)
    sut.emit()
    expect(resultQueue).toEqual([1])
  })
  it('notify fifo resolves callbacks in fifo order', () => {
    const sut = new Observable()
    const resultQueue: number[] = []
    const handler1 = () => resultQueue.push(1)
    const handler2 = () => resultQueue.push(2)
    const handler3 = () => resultQueue.push(3)

    sut.subscribe(handler1)
    sut.subscribe(handler2)
    sut.subscribe(handler3)
    sut.emit({} as unknown as void, { callbackOrder: 'fifo' })
    expect(resultQueue).toEqual([1, 2, 3])
  })
  it('notify lifo resolves callbacks in lifo order', () => {
    const sut = new Observable()
    const resultQueue: number[] = []
    const handler1 = () => resultQueue.push(1)
    const handler2 = () => resultQueue.push(2)
    const handler3 = () => resultQueue.push(3)

    sut.subscribe(handler1)
    sut.subscribe(handler2)
    sut.subscribe(handler3)
    sut.emit({} as unknown as void, { callbackOrder: 'lifo' })
    expect(resultQueue).toEqual([3, 2, 1])
  })
  it('callback options stop leads to subsequent listeners to not be invoked', () => {
    const sut = new Observable()
    const resultQueue: number[] = []
    const handler1 = () => resultQueue.push(1)
    const handler3 = () => resultQueue.push(3)

    sut.subscribe(handler1)
    const unblock = sut.addBlockade()
    sut.subscribe(handler3)

    sut.emit()
    expect(resultQueue).toEqual([3])

    unblock()
    sut.emit()
    expect(resultQueue).toEqual([3, 3, 1])
  })
  it('subscribe with options triggerOnce only invokes callback once', () => {
    const sut = new Observable()
    let result = 0
    const handler = () => result++

    sut.subscribe(handler, { triggerOnce: true })
    sut.emit()
    sut.emit()
    expect(result).toEqual(1)
  })
})
