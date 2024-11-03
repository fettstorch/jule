/**
 * Maps the keys of a map to transformed values.
 * @param sourceMap - The source map.
 * @param transformer - The transformer function - transforming the sourceMap's values.
 * @returns A new map with the same keys as the source map, but with transformed values.
 * @example
 * ```ts
 * const original = new Map([['a', 1], ['b', 2]])
 * const transformed = mapValues(original, (val) => val.toString())
 * // transformed is now a new Map([['a', '1'], ['b', '2']])
 * ```
 */
export function mapValues<Key, Val, NewVal>(
  sourceMap: Map<Key, Val>,
  transformer: (val: Val) => NewVal
): Map<Key, NewVal> {
  return new Map(Array.from(sourceMap.entries(), ([key, val]) => [key, transformer(val)]))
}
