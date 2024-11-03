import { describe, expect, it } from 'vitest'
import { awaitable } from '../src/awaitable'
import { debounce, debounced } from '../src/debounce'

describe('debounce', () => {
  it('should never execute a callback multiple times if the handler is called multiple times within the delay', async () => {
    let state = 0
    const { promise, resolve } = awaitable()

    const action = () => {
      state++
      resolve()
    }
    const debouncedAction = debounced(action, 0)

    debouncedAction()
    debouncedAction()
    debouncedAction()

    await promise
    expect(state).toEqual(1)
  })

  it('should allow a handler to be called again after the delay', async () => {
    const { promise, resolve: res } = awaitable()
    let resolve = res

    let state = 0

    const handler = () =>
      debounce(() => {
        state++
        resolve()
      }, 0)

    handler()
    await promise
    const { promise: p2, resolve: res2 } = awaitable()
    resolve = res2

    handler()
    handler()
    await p2

    expect(state).toEqual(2)
  })

  //describe('decorator', () => {
  //  it('decorator counterpart should not create global shared state between different debounced methods', async () => {
  //    const { promise, resolve } = awaitable()
  //    class Test {
  //      fooState = 0
  //      @Debounced(10)
  //      foo() {
  //        this.fooState++
  //        console.debug('foo')
  //        resolve()
  //      }

  //      @Debounced(0)
  //      bar() {
  //        this.fooState++
  //        console.debug('bar')
  //        resolve()
  //      }
  //    }
  //    class Interferer {
  //      @Debounced(0)
  //      interfererFoo() {
  //        console.debug('interferer foo')
  //        resolve()
  //      }
  //    }

  //    const interferer = new Interferer()
  //    const test = new Test()
  //    test.foo()
  //    test.foo()
  //    interferer.interfererFoo()
  //    test.bar()
  //    await promise
  //    expect(test.fooState).toEqual(2)
  //  })
  //  it('should allow a handler to be called again after the delay', async () => {
  //    class Test {
  //      @Debounced(0)
  //      test() {
  //        this.state++
  //        this.awaitable.resolve(undefined)
  //      }
  //      state = 0
  //      awaitable = awaitable()
  //    }

  //    const test = new Test()
  //    test.test()
  //    test.test()
  //    await test.awaitable.promise
  //    expect(test.state).toEqual(1)
  //  })
  //})
})
