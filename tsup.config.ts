import { defineConfig } from 'tsup';

export default defineConfig([
  // Main library build
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: false,
    minify: true,
    splitting: false,
    cjsInterop: true,
    footer({ format }) {
      if (format == 'cjs')
        return { js: 'module.exports = module.exports.default;' };
    },
  },
  // CLI build
  {
    entry: { cli: 'src/cli.ts' },
    format: ['cjs'],
    sourcemap: false,
    minify: true,
    splitting: false,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
