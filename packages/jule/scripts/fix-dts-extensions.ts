/**
 * tsc emits extensionless relative specifiers in .d.ts files (e.g.
 * `export { x } from './x'`). Consumers on `moduleResolution: node16/nodenext`
 * require explicit extensions, so rewrite every relative specifier in the
 * emitted declarations to carry a `.js` extension. Operates only on build
 * output under dist/ — never on source.
 */
import { Glob } from 'bun'

const RELATIVE_SPECIFIER = /(from\s*['"])(\.\.?\/[^'"]*?)(['"])/g

const dist = new Glob('**/*.d.ts')
let patched = 0

for await (const rel of dist.scan('dist')) {
  const path = `dist/${rel}`
  const source = await Bun.file(path).text()
  const next = source.replace(RELATIVE_SPECIFIER, (_match, pre, spec, post) =>
    spec.endsWith('.js') ? `${pre}${spec}${post}` : `${pre}${spec}.js${post}`
  )
  if (next !== source) {
    await Bun.write(path, next)
    patched++
  }
}

// oxlint-disable-next-line no-console -- build-time progress output
console.log(`fix-dts-extensions: patched ${patched} declaration file(s)`)
