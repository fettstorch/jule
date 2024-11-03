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
function foo(case: number): string {
    return when(case)({
        1: () => 'one',
        2: () => 'two',
        else: () => 'something else'
    })
}
```

### awaitable
```ts
import { awaitable } from '@fettstorch/jule'
const { promise, resolve } = awaitable()
```

### Observable
```ts
import { Observable } from '@fettstorch/jule'
const observable = new Observable<number>()
observable.subscribe(value => console.log(value))
observable.emit(1)
```

### once
```ts
import { once } from '@fettstorch/jule'
const cachedAction = once(() => computationHeavyStuff())
cachedAction()
cachedAction() // will only execute computationHeavyStuff once
```

### sleep
```ts
import { sleep } from '@fettstorch/jule'
await sleep(1000)
```

### debounce
```ts
import { getDebouncer } from '@fettstorch/jule'
const { debounce } = getDebouncer()
const action = () => console.log('action')
const debouncedAction = debounce(action, 1000)
debouncedAction()
debouncedAction()
debouncedAction() // will log 'action' once after 1 second
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
