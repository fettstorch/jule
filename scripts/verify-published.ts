// oxlint-disable no-console -- build/verification tooling logs progress
/**
 * Published-package verification.
 *
 * Installs the most recently published @fettstorch/jule straight from
 * the npm registry (the `latest` dist-tag) into the test-only consumer
 * as a real dependency, then runs the consumer's type-resolution +
 * runtime smoke tests against that installed package.
 *
 * Unlike `verify-package.ts` (which packs the local working tree), this
 * proves what real users actually get from `npm install @fettstorch/jule`
 * right now. The consumer is NOT a workspace member, so it resolves the
 * registry package's built `dist/` + exports map — never the library
 * source. A clean install (node_modules + lockfile wiped) is mandatory
 * so the `latest` tag is always re-resolved to the newest release rather
 * than a stale pinned version.
 */
import { rmSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { $ } from 'bun'

const root = dirname(import.meta.dir)
const consumer = join(root, 'apps/published-consumer')

console.log('▸ clean-installing @fettstorch/jule@latest from the npm registry')
rmSync(join(consumer, 'node_modules'), { recursive: true, force: true })
rmSync(join(consumer, 'bun.lock'), { force: true })
await $`bun install`.cwd(consumer)

console.log('▸ type-checking the consumer against the published .d.ts (nodenext)')
await $`bun run typecheck`.cwd(consumer)

console.log('▸ running the consumer packaging smoke tests')
await $`bun test`.cwd(consumer)

console.log('✓ published package verified: @fettstorch/jule@latest is usable by a consumer')
