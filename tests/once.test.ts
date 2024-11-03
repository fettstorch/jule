import { describe, expect, it } from 'vitest'
import { Once, once } from '../src/once'

describe('once', () => {
  it('should keep exact return values and not reduce null to undefined', () => {
    const originalFunctionReturningNull = () => null
    const originalFunctionReturningUndefined = () => undefined
    const onceFunctionReturningNull = once(originalFunctionReturningNull)
    const onceFunctionReturningUndefined = once(originalFunctionReturningUndefined)
    expect(onceFunctionReturningNull()).toEqual(null)
    expect(onceFunctionReturningUndefined()).toEqual(undefined)
  })

  it('should return undefined as cached value for a original void returning function', () => {
    const originalFunctionReturningVoid = () => {}
    const onceFunctionReturningVoid = once(originalFunctionReturningVoid)
    expect(onceFunctionReturningVoid()).toEqual(undefined)
  })

  it('should only ever execute a function once', () => {
    let counter = 0
    const originalFunction = () => {
      counter++
    }
    const onceFunction = once(originalFunction)
    onceFunction()
    onceFunction()
    onceFunction()
    onceFunction()
    expect(counter).toEqual(1)
  })

  it('should not create shared state in- and between instances', function () {
    class TestClass {
      constructor(public readonly data: number) {}
      foo = once(() => this.data)
      bar = once(() => this.data + 1)
    }

    const testInstance1 = new TestClass(1)
    const testInstance2 = new TestClass(2)

    expect(testInstance1.foo()).toEqual(1)
    expect(testInstance1.bar()).toEqual(2)

    expect(testInstance2.foo()).toEqual(2)
    expect(testInstance2.bar()).toEqual(3)
  })

  //describe('Decorator', () => {
  //  it('should only ever execute a method once', () => {
  //    class TestClass {
  //      counter = 0

  //      @Once
  //      get getter() {
  //        this.counter++
  //        return 0
  //      }
  //    }
  //    const testInstance = new TestClass()
  //    testInstance.getter
  //    testInstance.getter
  //    expect(testInstance.counter).toEqual(1)
  //  })

  //  it('should not create shared global state in- and between instances', () => {
  //    class TestClass {
  //      constructor(public readonly data: number) {}
  //      state = 0

  //      @Once
  //      get foo() {
  //        this.state++
  //        return this.data
  //      }

  //      @Once
  //      get bar() {
  //        this.state++
  //        return this.data + 1
  //      }
  //    }

  //    const testInstance1 = new TestClass(1)
  //    const testInstance2 = new TestClass(2)

  //    expect(testInstance1.foo).toEqual(1)
  //    expect(testInstance2.foo).toEqual(2)

  //    expect(testInstance1.bar).toEqual(2)
  //    expect(testInstance2.bar).toEqual(3)

  //    testInstance1.foo
  //    expect(testInstance1.state).toEqual(2)
  //  })
  //})
})
