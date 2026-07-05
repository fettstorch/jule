/**
 * @param ms - milliseconds to sleep
 * @returns a promise that resolves after the given number of milliseconds
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
