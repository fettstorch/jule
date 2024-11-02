type CaseHandlerFunction<Case, R> = (c: Case) => R
type Ret<Case, R> = R | CaseHandlerFunction<Case, R>

type ExhaustiveCaseRecord<Case extends PropertyKey | undefined, R> = {
  [Type in Exclude<Case, undefined>]: Ret<Type, R>
} & {
  [Type in Case extends undefined ? 'else' : never]: Ret<Case, R>
}

type PartialCaseRecord<Case extends PropertyKey | undefined, R> = {
  [Type in Exclude<Case, undefined>]?: Ret<Type, R>
} & {
  else: Ret<Case, R>
}

type Cases<Case extends PropertyKey | undefined, R> =
  | ExhaustiveCaseRecord<Case, R>
  | PartialCaseRecord<Case, R>
/**
 * switch-case like function that does not fall through and returns the case result.
 * It is typesafe and demands exhaustive case handling.
 * However, (as switch-case) it can only handle cases, that can be used as an index.
 *
 * @example
 * ```ts
 * function foo(a: 1 | 2 | 3): number {
 *     return when(a)({
 *         1: 1,
 *         2: () => 2,
 *         else: (b) => b,
 *     })
 * }
 * ```
 *
 * when can also handle inputs that are possibly undefined. However instead of accessing that case with an indexable
 * 'undefined' case, that case should be handled with a case handler like this:
 * @example
 * ```ts
 * function foo(a: 1 | 2 | undefined): number {
 *   return when(a)({
 *      1: 1,
 *      else: (it) => it ?? 3
 *   })
 * }
 * ```
 */
export function when<Case extends PropertyKey | undefined>(
  c: Case
): <Ret>(cases: Cases<Case, Ret>) => Ret {
  return <R>(cases: Cases<Case, R>): R => {
    const elseHandler = (cases as any).else
    const safeAccessor = c as unknown as Exclude<Case, undefined>

    const handler: Ret<Case, R> = safeAccessor in cases ? cases[safeAccessor] : elseHandler
    if (typeof handler === 'function') {
      return (handler as CaseHandlerFunction<Case, R>)(c)
    }
    return handler
  }
}
