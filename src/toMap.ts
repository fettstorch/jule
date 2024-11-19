/** Creates a map from an iterable or an object by transforming each element
 * @example
 * ```ts
 * const map = toMap([1, 2], (value) => [value, value * 2])
 * // => Map { '1' => 2, '2' => 4 }
 * ___
 * const map = new Map([['a', 1], ['b', 2]])
 * const newMap = toMap(map, ([key, value]) => [key, value * 2])
 * // => Map { 'a' => 2, 'b' => 4 }
 * ___
 * const map = toMap({ a: 1, b: 2 }, ([key, value]) => [key, value * 2])
 * // => Map { 'a' => 2, 'b' => 4 }
 * ```
 */
export function toMap<V, NK, NV>(
  obj: Record<string, V>,
  transform: (el: [string, V], idx: number) => [NK, NV]
): Map<NK, NV>

export function toMap<V, NK, NV>(
  iterable: Iterable<V>,
  transform: (el: V, idx: number) => [NK, NV]
): Map<NK, NV>

export function toMap<V, NK, NV>(
  elements: Iterable<V> | Record<string, V>,
  transform: ((el: V, idx: number) => [NK, NV]) | ((el: [string, V], idx: number) => [NK, NV])
): Map<NK, NV> {
  const iterable = Symbol.iterator in elements ? [...elements] : [...Object.entries(elements)]
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  return new Map(iterable.map(transform as any))
}
