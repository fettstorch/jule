// oxlint-disable no-console -- build/verification tooling logs progress
/**
 * Gold-standard packaging verification.
 *
 * Packs @fettstorch/jule exactly as it would publish (prepack runs
 * build + unit tests), installs the resulting tarball into the
 * test-only consumer as a real dependency, and runs the consumer's
 * type-resolution + runtime smoke tests against that installed package.
 *
 * The consumer is NOT a workspace member, so it resolves the tarball's
 * built `dist/` + exports map — never the library source. A clean
 * install (node_modules + lockfile wiped) is mandatory: Bun serves
 * stale content for a same-named `file:` tarball otherwise, which would
 * silently test an old build.
 */
import { readdirSync, renameSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { $ } from 'bun'

const root = dirname(import.meta.dir)
const lib = join(root, 'packages/jule')
const consumer = join(root, 'apps/local-consumer')
const tarball = join(consumer, 'jule.tgz')

// Clear any prior tarball so the rename below is unambiguous.
for (const entry of readdirSync(consumer)) {
  if (entry.endsWith('.tgz')) rmSync(join(consumer, entry))
}

console.log('▸ packing @fettstorch/jule (runs prepack: build + tests)')
// `bun pm pack --destination` emits `fettstorch-jule-<version>.tgz`.
await $`bun pm pack --destination ${consumer}`.cwd(lib)
const packed = readdirSync(consumer).find((f) => f.endsWith('.tgz'))
if (!packed) throw new Error('pack produced no tarball')
renameSync(join(consumer, packed), tarball)

console.log('▸ clean-installing the packed tarball into the consumer')
rmSync(join(consumer, 'node_modules'), { recursive: true, force: true })
rmSync(join(consumer, 'bun.lock'), { force: true })
await $`bun install`.cwd(consumer)

console.log('▸ type-checking the consumer against the published .d.ts (nodenext)')
await $`bun run typecheck`.cwd(consumer)

console.log('▸ running the consumer packaging smoke tests')
await $`bun test`.cwd(consumer)

console.log('✓ packaging verified: the packed tarball is usable by a consumer')
