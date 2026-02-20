import { defineConfig } from 'tsup';

export default defineConfig([
  // Main library build
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: false,
    clean: true,
    sourcemap: false,
    minify: true,
    splitting: false,
    cjsInterop: true,
  },
  {
    entry: ['src/index.ts'],
    format: ['cjs'],
    dts: true,
    clean: true,
    sourcemap: false,
    minify: true,
    splitting: false,
    cjsInterop: true,
    footer() {
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
