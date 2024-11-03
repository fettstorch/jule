# @fettstorch/jule

A collection of TypeScript utilities I use in my projects.

## Installation

Using bun:
```bash
bun add @fettstorch/jule
```

## Usage examples

### when
```ts
import { when } from '@fettstorch/jule'
function foo(case: number | undefined): string {
    return when(case)({
        1: 'one',
        2: () => 'two',
        3: (c) => `three ${c}`,
        else: (c) => `something else ${c}`
    })
}
```

### awaitable
```ts
import { awaitable } from '@fettstorch/jule'
const { promise, resolve } = awaitable<number>()
await promise
// somewhere else
resolve(42)
```

### Observable
```ts
import { Observable } from '@fettstorch/jule'
const observable = new Observable<number>()
observable.subscribe(value => console.log(value))
observable.emit(1)
```

### once (lazy)
```ts
import { once } from '@fettstorch/jule'
const cachedAction = once(() => computationHeavyStuff())
cachedAction() // heavy computation happens here lazily
cachedAction() // will return the cached result instead of running the heavy computation again
```

### sleep
```ts
import { sleep } from '@fettstorch/jule'
await sleep(1000)
```

### debounce
```ts
import { debounce } from '@fettstorch/jule'
const action = () => console.log('action')
debounce(action, 1000)
debounce(action, 1000)
debounce(action, 1000) // will log 'action' once after 1 second
// OR
import { debounced } from '@fettstorch/jule'
const debouncedAction = debounced(action, 1000)
debouncedAction()
debouncedAction()
debouncedAction() // will log 'action' once after 1 second
// OR
import { debounce } from '@fettstorch/jule'
const action1 = () => console.log('action1')
const action2 = () => console.log('action2')
debounce(action1, 1000) // will be forgotten in favor of action2
debounce(action2, 1000) // action2 will be logged after 1 second
```
### synchronize
```ts
import { synchronize } from '@fettstorch/jule'
let result = 0
const lock = {}
const foo = () => { result = 1 }
const bar = async () => { await sleep(1000); result = 2 }
const syncedFoo = synchronize(foo, lock)
const syncedBar = synchronize(bar, lock)
syncedBar()
syncedFoo()
//await bar -> result is 1 as syncedFoo will definitely be executed after syncedBar
```
