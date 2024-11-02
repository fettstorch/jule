/**
 * A function type that can be used to define a function with a specific context and arguments.
 */
export type Func<T = undefined, Args extends unknown[] = void[], Ret = void> = (
  this: T,
  ...args: Args
) => Ret
