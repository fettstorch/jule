import type { Satisfies } from './Satisfies'

/** Utility type to create a fixed-size array with a given type.
 * @example
 * ```ts
 * function foo(a: SizedArray<3, number>) {
 *   // ...
 * }
 * foo([1, 2, 3]) // ok
 * foo([1, 2]) // error
 * ```
 */
export type SizedArray<S extends number, T, R extends unknown[] = []> = R['length'] extends S
  ? R
  : SizedArray<S, T, [T, ...R]>

// @ts-expect-error
type _fails_for_too_short = Satisfies<SizedArray<3, number>, [number, number]>
// @ts-expect-error
type _fails_for_wrong_length_2 = Satisfies<SizedArray<3, number>, [number, number]>
// @ts-expect-error
type _fails_for_wrong_type = Satisfies<SizedArray<3, number>, [string, number, number]>
