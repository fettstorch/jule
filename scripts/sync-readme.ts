// oxlint-disable no-console -- tooling logs progress
/**
 * Mirrors packages/jule/README.md to the repo root so the GitHub landing
 * page shows the library's quick docs. The package README is the single
 * source of truth; the root copy is generated — never hand-edit it.
 *
 * Usage:
 *   bun run scripts/sync-readme.ts          # write root README.md
 *   bun run scripts/sync-readme.ts --check  # exit 1 if root is stale
 */
import { dirname, join } from 'node:path'

const root = dirname(import.meta.dir)
const source = join(root, 'packages/jule/README.md')
const target = join(root, 'README.md')
const marker =
  '<!-- Generated from packages/jule/README.md — edit that file, then run `bun run sync:readme`. -->\n\n'

const body = await Bun.file(source).text()
const mirrored = marker + body

if (process.argv.includes('--check')) {
  const current = (await Bun.file(target).exists()) ? await Bun.file(target).text() : ''
  if (current !== mirrored) {
    console.error(
      'root README.md is out of sync with packages/jule/README.md — run `bun run sync:readme`'
    )
    process.exit(1)
  }
  console.log('README in sync')
} else {
  await Bun.write(target, mirrored)
  console.log('synced README.md from packages/jule/README.md')
}
