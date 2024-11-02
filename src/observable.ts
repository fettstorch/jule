/**
 * An Observable instance provides methods to both subscribe and notify listeners,
 * based on generic event data and callback response types.
 *
 * @example
 * ```ts
 * const observable = new Observable()
 * observable.subscribe(() => console.log('callback 1'))
 * observable.subscribe(() => console.log('callback 2'))
 * observable.emit() // logs 'callback 2' and 'callback 1'
 *
 * const observable2 = new Observable<number, string>()
 * observable2.subscribe((data: number) => `cat ${data}`)
 * observable2.subscribe((data: number) => `dog ${data}`)
 * observable2.emit(2) // returns ['dog 2', 'cat 2']
 * ```
 */
export class Observable<EventData = void, CallbackResponse = void> {
  private listeners: Set<Callback<EventData, CallbackResponse>> = new Set()

  private callbackConfigMap: WeakMap<
    Callback<EventData, CallbackResponse>,
    InternalCallbackConfig
  > = new WeakMap()

  /**
   * Registers a callback to be executed when the observable is notified.
   * @return an executable that will unsubscribe the callback from the observable
   * @example
   * ```ts
   * const observable = new Observable()
   * const unsubscribe = observable.subscribe(() => console.log('callback'))
   * observable.emit() // logs 'callback'
   * observable.emit() // logs 'callback'
   *
   * const observable2 = new Observable()
   * observable2.subscribe(() => console.log('callback2'), { triggerOnce: true })
   * observable2.emit() // logs 'callback2'
   * observable2.emit() // no output - callback is unsubscribed
   * ```
   */
  subscribe(callback: Callback<EventData, CallbackResponse>, opts?: CallbackConfig) {
    this._subscribe(callback, { ...defaultCallbackConfig, ...opts })
    return () => this.unsubscribe(callback)
  }

  /**
   * Unregisters a callback from the observable.
   */
  unsubscribe(callback: Callback<EventData, CallbackResponse>) {
    this.listeners.delete(callback as Callback<EventData, CallbackResponse>)
  }

  /**
   * Notifies all registered callbacks with the provided event data.
   * @param data - The event data to be passed to each callback.
   * @param notifyOptions - Options for controlling the order of callback execution.
   * @returns An array of callback responses - depends on callback execution order.
   * @example
   * ```ts
   * const observable = new Observable<number, number>()
   * observable.subscribe((data) => data + 1)
   * observable.subscribe((data) => data + 2)
   * observable.emit(1) // returns [2, 3]
   * ```
   */
  emit(data: EventData, notifyOptions: NotifyOptions = { callbackOrder: 'lifo' }) {
    const results: CallbackResponse[] = []
    const listeners = Array.from(this.listeners)

    if (notifyOptions.callbackOrder === 'lifo') {
      listeners.reverse()
    }

    for (const callback of listeners) {
      const callbackConfig = this.callbackConfigMap.get(callback)
      if (callbackConfig?.stop) {
        break
      }

      results.push(callback(data))

      if (callbackConfig?.triggerOnce) {
        this.unsubscribe(callback)
      }
    }
    return results
  }

  /**
   * Prevents the execution of **all** subsequent subscribed callbacks.
   * Does **not** prevent the execution of subscribed callbacks that run
   * **before** the blockade.
   *
   * @return an executable that will dissolve the blockade and enable subsequent
   * subscribed callbacks to run again.
   */
  addBlockade(): () => void {
    const blockade = (() => {}) as unknown as Callback<EventData, CallbackResponse>
    this._subscribe(blockade, { stop: true })
    return () => this.unsubscribe(blockade)
  }

  // --- private

  private _subscribe(
    callback: (data: EventData) => CallbackResponse,
    callbackConfig: InternalCallbackConfig
  ) {
    this.listeners.add(callback as Callback<EventData, CallbackResponse>)

    this.callbackConfigMap.set(callback as Callback<EventData, CallbackResponse>, {
      ...defaultCallbackConfig,
      ...callbackConfig
    })
  }
}

// --- module private

type Callback<EventData, CallbackResponse> = (data: EventData) => CallbackResponse

type CallbackConfig = Partial<{
  triggerOnce: boolean
}>

type InternalCallbackConfig = CallbackConfig & { stop: boolean }

type NotifyOptions = {
  callbackOrder: 'fifo' | 'lifo'
}

const defaultCallbackConfig = {
  stop: false,
  triggerOnce: false
} as const satisfies Required<InternalCallbackConfig>
