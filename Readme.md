
<h1 align="center">pxtorem-css</h1>

<p align="center">
  <strong>A modern PostCSS plugin & CLI to convert px → rem, em, vw, vh and more</strong>
</p>
<p align="center">
  <img src="https://img.shields.io/npm/v/pxtorem-css?style=flat-square&color=blue" alt="npm version" />
  <img src="https://img.shields.io/npm/dm/pxtorem-css?style=flat-square&color=green" alt="downloads" />
  <img src="https://img.shields.io/npm/l/pxtorem-css?style=flat-square" alt="license" />
  <img src="https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square&logo=typescript" alt="typescript" />
</p>

---

## ✨ Features

- 🎯 **Multiple Units** — Convert to `rem`, `em`, `vw`, `vh`, `vmin`, `vmax`, `%`
- ⚡ **Fast & Lightweight** — Zero dependencies (except postcss)
- 🔧 **Highly Configurable** — Per-property settings, custom transforms
- 💬 **Comment Control** — Disable conversion with inline comments
- 📊 **Conversion Reports** — Track what was converted
- 🖥️ **CLI Included** — Convert files from command line
- � **TypeScript** — Full type definitions included

---

## 📦 Installation

```bash
# npm
npm install pxtorem-css postcss --save-dev

# yarn
yarn add pxtorem-css postcss -D

# pnpm
pnpm add pxtorem-css postcss -D
```

---

## 🚀 Quick Start

### PostCSS Config

```js
// postcss.config.js
module.exports = {
  plugins: [
    require('pxtorem-css')({
      baseSize: 16,
      properties: ['*'],
    }),
  ],
};
```

### CLI

```bash
# Convert a file
npx pxtorem style.css

# With options
npx pxtorem style.css -b 16 -u rem --min-value 2
```

---

## 📖 Usage Examples

<details>
<summary><strong>Vite</strong></summary>

```js
// vite.config.js
import { defineConfig } from 'vite';
import pxtorem from 'pxtorem-css';

export default defineConfig({
  css: {
    postcss: {
      plugins: [
        pxtorem({
          baseSize: 16,
          properties: ['*'],
        }),
      ],
    },
  },
});
```

</details>

<details>
<summary><strong>Next.js</strong></summary>

```js
// postcss.config.js
module.exports = {
  plugins: {
    'pxtorem-css': {
      baseSize: 16,
      properties: ['*'],
    },
  },
};
```

</details>

<details>
<summary><strong>Webpack</strong></summary>

```js
// postcss.config.js
module.exports = {
  plugins: [
    require('pxtorem-css')({
      baseSize: 16,
      properties: ['*'],
      minValue: 2,
    }),
    require('autoprefixer'),
  ],
};
```

</details>

<details>
<summary><strong>Node.js Script</strong></summary>

```js
const fs = require('fs');
const postcss = require('postcss');
const pxtorem = require('pxtorem-css');

const css = fs.readFileSync('input.css', 'utf8');

postcss([pxtorem({ baseSize: 16 })])
  .process(css)
  .then((result) => {
    fs.writeFileSync('output.css', result.css);
  });
```

</details>

---

## ⚙️ Options

| Option                | Type                   | Default    | Description                                                |
| --------------------- | ---------------------- | ---------- | ---------------------------------------------------------- |
| `baseSize`            | `number \| function`   | `16`       | Base font size for conversion                              |
| `toUnit`              | `string`               | `'rem'`    | Target unit (`rem`, `em`, `vw`, `vh`, `vmin`, `vmax`, `%`) |
| `fromUnit`            | `string`               | `'px'`     | Source unit to convert                                     |
| `precision`           | `number`               | `5`        | Decimal precision                                          |
| `properties`          | `string[]`             | `['*']`    | Properties to convert (supports wildcards)                 |
| `skipSelectors`       | `(string \| RegExp)[]` | `[]`       | Selectors to skip                                          |
| `minValue`            | `number`               | `0`        | Skip values below this                                     |
| `maxValue`            | `number`               | `Infinity` | Skip values above this                                     |
| `convertMediaQueries` | `boolean`              | `false`    | Convert in media queries                                   |
| `replaceOriginal`     | `boolean`              | `true`     | Replace vs add fallback                                    |
| `propertyBaseSize`    | `object`               | `{}`       | Per-property base sizes                                    |
| `convert`             | `function`             | `null`     | Custom conversion function                                 |
| `verbose`             | `boolean`              | `false`    | Log conversions                                            |

---

## 🎨 Advanced Examples

### Property Wildcards

```js
pxtorem({
  properties: ['font*', '*margin*', '!border*'],
  // ✓ font-size, font-weight, margin, margin-top
  // ✗ border, border-width
});
```

### Per-Property Base Size

```js
pxtorem({
  baseSize: 16,
  propertyBaseSize: {
    'font-size': 14,
    'line-height': 20,
  },
});
```

### Custom Transform

```js
pxtorem({
  convert: (px, property, selector) => {
    // Skip small values
    if (px < 4) return false;

    // Use CSS variable
    if (px === 16) return 'var(--base-size)';

    // Round to 0.25rem
    return Math.round((px / 16) * 4) / 4;
  },
});
```

### Viewport Units (Mobile-First)

```js
pxtorem({
  toUnit: 'vw',
  baseSize: 3.75, // 375px / 100vw
  properties: ['*'],
});
```

---

## 💬 Comment Control

Disable conversion with inline comments:

```css
.element {
  font-size: 16px; /* → 1rem */
  padding: 20px; /* pxtorem-disable-line */ /* → 20px (skipped) */

  /* pxtorem-disable */
  margin: 32px; /* → 32px (skipped) */
  border: 1px solid; /* → 1px (skipped) */
  /* pxtorem-enable */

  width: 100px; /* → 6.25rem */
}
```

| Comment                           | Effect               |
| --------------------------------- | -------------------- |
| `/* pxtorem-disable-line */`      | Skip current line    |
| `/* pxtorem-disable-next-line */` | Skip next line       |
| `/* pxtorem-disable */`           | Disable until enable |
| `/* pxtorem-enable */`            | Re-enable            |

---

## 🖥️ CLI Reference

```bash
pxtorem [options] <input>
```

| Option                    | Description                       |
| ------------------------- | --------------------------------- |
| `-o, --output <path>`     | Output file/directory             |
| `-b, --base-size <n>`     | Base font size                    |
| `-u, --to-unit <unit>`    | Target unit                       |
| `-p, --precision <n>`     | Decimal precision                 |
| `--properties <list>`     | Comma-separated properties        |
| `--skip-selectors <list>` | Comma-separated selectors to skip |
| `--min-value <n>`         | Min px value                      |
| `--max-value <n>`         | Max px value                      |
| `--media-queries`         | Convert in media queries          |
| `--no-replace`            | Add fallback instead of replacing |
| `-v, --verbose`           | Verbose output                    |
| `-h, --help`              | Show help                         |

### CLI Examples

```bash
# Basic conversion
pxtorem style.css

# Custom options
pxtorem style.css -b 16 -u rem -p 5 --min-value 2

# Different output
pxtorem -o dist/styles.css src/styles.css

# Directory conversion
pxtorem -o dist/css src/css

# Filter properties
pxtorem style.css --properties "font-size,margin,padding"
```

---

## 📘 TypeScript

```ts
import pxtorem, { Options, ConversionReport, TargetUnit } from 'pxtorem-css';

const options: Options = {
  baseSize: 16,
  toUnit: 'rem',
  onConversionComplete: (report: ConversionReport) => {
    console.log(`Converted: ${report.convertedDeclarations}`);
  },
};
```

---

## 📄 License

MIT © [Rashed Iqbal](https://github.com/iqbal-rashed)
