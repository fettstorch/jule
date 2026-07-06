/**
 * Type-resolution probe against the PUBLISHED package. This file is
 * never executed — it exists so `tsc --noEmit` (moduleResolution:
 * nodenext) proves the published `.d.ts` surface resolves for a real
 * consumer. If the released package ships broken types (e.g.
 * extensionless re-exports under nodenext), this fails to type-check.
 */
import {
  awaitable,
  type Awaitable,
  cached,
  debounce,
  type Func,
  Observable,
  once,
  retryable,
  type SizedArray,
  sleep,
  subject,
  synchronize,
  toMap,
  when
} from '@fettstorch/jule'

const signal: Awaitable<number> = awaitable<number>()
signal.resolve(1)

const num: number = when(1 as 1 | 2)({ 1: 10, else: 20 })

const memo: () => number = once(() => 42)
const cachedFn = cached((n: number) => n * 2)
const obs = new Observable<string>()

const identity: Func<void, [number], number> = (n) => n
const pair: SizedArray<2, number> = [1, 2]

export const _typeProbe = {
  signal,
  num,
  memo,
  cachedFn,
  obs,
  identity,
  pair,
  debounce,
  retryable,
  sleep,
  subject,
  synchronize,
  toMap
}
