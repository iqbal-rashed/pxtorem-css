import { describe, it, expect, vi } from 'vitest';
import postcss from 'postcss';
import pxtorem from '../src';
import type { ConversionReport } from '../src';

async function run(input: string, options = {}) {
  const result = await postcss([pxtorem(options)]).process(input, {
    from: undefined,
  });
  return result.css;
}

describe('pxtorem-css', () => {
  describe('basic conversion', () => {
    it('should convert px to rem with default baseSize of 16', async () => {
      const input = '.test { font-size: 32px; }';
      const expected = '.test { font-size: 2rem; }';
      expect(await run(input)).toBe(expected);
    });

    it('should convert multiple px values', async () => {
      const input = '.test { font-size: 16px; line-height: 24px; }';
      const expected = '.test { font-size: 1rem; line-height: 1.5rem; }';
      expect(await run(input)).toBe(expected);
    });

    it('should handle decimal px values', async () => {
      const input = '.test { font-size: 15.5px; }';
      const expected = '.test { font-size: 0.96875rem; }';
      expect(await run(input)).toBe(expected);
    });
  });

  describe('baseSize option', () => {
    it('should use custom baseSize', async () => {
      const input = '.test { font-size: 20px; }';
      const expected = '.test { font-size: 2rem; }';
      expect(await run(input, { baseSize: 10 })).toBe(expected);
    });

    it('should support baseSize as function', async () => {
      const input = '.test { font-size: 32px; }';
      const expected = '.test { font-size: 1rem; }';
      expect(await run(input, { baseSize: () => 32 })).toBe(expected);
    });
  });

  describe('toUnit option', () => {
    it('should convert to em', async () => {
      const input = '.test { font-size: 16px; }';
      const expected = '.test { font-size: 1em; }';
      expect(await run(input, { toUnit: 'em' })).toBe(expected);
    });

    it('should convert to vw', async () => {
      const input = '.test { width: 160px; }';
      const expected = '.test { width: 10vw; }';
      expect(await run(input, { toUnit: 'vw' })).toBe(expected);
    });

    it('should convert to vh', async () => {
      const input = '.test { height: 80px; }';
      const expected = '.test { height: 5vh; }';
      expect(await run(input, { toUnit: 'vh' })).toBe(expected);
    });

    it('should convert to %', async () => {
      const input = '.test { width: 50px; }';
      const expected = '.test { width: 50%; }';
      expect(await run(input, { toUnit: '%', baseSize: 1 })).toBe(expected);
    });
  });

  describe('properties option', () => {
    it('should only convert properties in list', async () => {
      const input = '.test { font-size: 16px; margin: 16px; }';
      const expected = '.test { font-size: 1rem; margin: 16px; }';
      expect(await run(input, { properties: ['font-size'] })).toBe(expected);
    });

    it('should convert all properties with wildcard *', async () => {
      const input = '.test { font-size: 16px; margin: 16px; padding: 16px; }';
      const expected =
        '.test { font-size: 1rem; margin: 1rem; padding: 1rem; }';
      expect(await run(input, { properties: ['*'] })).toBe(expected);
    });

    it('should support wildcard at start', async () => {
      const input = '.test { font-size: 16px; background-size: 16px; }';
      const expected = '.test { font-size: 1rem; background-size: 1rem; }';
      expect(await run(input, { properties: ['*size'] })).toBe(expected);
    });

    it('should support wildcard at end', async () => {
      const input = '.test { font-size: 16px; font-weight: 500; }';
      const expected = '.test { font-size: 1rem; font-weight: 500; }';
      expect(await run(input, { properties: ['font*'] })).toBe(expected);
    });

    it('should support negation with !', async () => {
      const input = '.test { font-size: 16px; margin: 16px; }';
      const expected = '.test { font-size: 1rem; margin: 16px; }';
      expect(await run(input, { properties: ['*', '!margin'] })).toBe(expected);
    });
  });

  describe('propertyBaseSize option', () => {
    it('should use property-specific baseSize', async () => {
      const input = '.test { font-size: 14px; line-height: 20px; }';
      const expected = '.test { font-size: 1rem; line-height: 1rem; }';
      expect(
        await run(input, {
          propertyBaseSize: { 'font-size': 14, 'line-height': 20 },
        })
      ).toBe(expected);
    });

    it('should fall back to baseSize for unspecified properties', async () => {
      const input = '.test { font-size: 14px; margin: 16px; }';
      const expected = '.test { font-size: 1rem; margin: 1rem; }';
      expect(
        await run(input, {
          baseSize: 16,
          propertyBaseSize: { 'font-size': 14 },
        })
      ).toBe(expected);
    });
  });

  describe('skipSelectors option', () => {
    it('should not convert selectors containing skipped string', async () => {
      const input =
        '.body-class { font-size: 16px; } .other { font-size: 16px; }';
      const expected =
        '.body-class { font-size: 16px; } .other { font-size: 1rem; }';
      expect(
        await run(input, { skipSelectors: ['body'], properties: ['*'] })
      ).toBe(expected);
    });

    it('should not convert selectors matching skipped regex', async () => {
      const input = 'body { font-size: 16px; } .body { font-size: 16px; }';
      const expected = 'body { font-size: 16px; } .body { font-size: 1rem; }';
      expect(
        await run(input, { skipSelectors: [/^body$/], properties: ['*'] })
      ).toBe(expected);
    });
  });

  describe('minValue and maxValue options', () => {
    it('should not convert values below minValue', async () => {
      const input = '.test { font-size: 16px; border: 1px solid black; }';
      const expected = '.test { font-size: 1rem; border: 1px solid black; }';
      expect(await run(input, { minValue: 2, properties: ['*'] })).toBe(
        expected
      );
    });

    it('should not convert values above maxValue', async () => {
      const input = '.test { font-size: 16px; width: 1000px; }';
      const expected = '.test { font-size: 1rem; width: 1000px; }';
      expect(await run(input, { maxValue: 100, properties: ['*'] })).toBe(
        expected
      );
    });
  });

  describe('convertMediaQueries option', () => {
    it('should not convert media queries by default', async () => {
      const input = '@media (min-width: 768px) { .test { font-size: 16px; } }';
      const expected =
        '@media (min-width: 768px) { .test { font-size: 1rem; } }';
      expect(await run(input, { properties: ['*'] })).toBe(expected);
    });

    it('should convert media query values when enabled', async () => {
      const input = '@media (min-width: 768px) { .test { font-size: 16px; } }';
      const expected =
        '@media (min-width: 48rem) { .test { font-size: 1rem; } }';
      expect(
        await run(input, { convertMediaQueries: true, properties: ['*'] })
      ).toBe(expected);
    });
  });

  describe('replaceOriginal option', () => {
    it('should replace the value by default', async () => {
      const input = '.test { font-size: 16px; }';
      const expected = '.test { font-size: 1rem; }';
      expect(await run(input, { properties: ['*'] })).toBe(expected);
    });

    it('should add fallback when replaceOriginal is false', async () => {
      const input = '.test { font-size: 16px; }';
      const expected = '.test { font-size: 16px; font-size: 1rem; }';
      expect(
        await run(input, { replaceOriginal: false, properties: ['*'] })
      ).toBe(expected);
    });
  });

  describe('convert option', () => {
    it('should use custom convert function', async () => {
      const input = '.test { font-size: 15px; }';
      const expected = '.test { font-size: 1rem; }';
      expect(
        await run(input, {
          convert: (px: number) => Math.round(px / 16),
        })
      ).toBe(expected);
    });

    it('should skip conversion when convert returns false', async () => {
      const input = '.test { font-size: 16px; margin: 16px; }';
      const expected = '.test { font-size: 16px; margin: 1rem; }';
      expect(
        await run(input, {
          convert: (px: number, prop: string) =>
            prop === 'font-size' ? false : px / 16,
        })
      ).toBe(expected);
    });

    it('should use custom string output from convert', async () => {
      const input = '.test { font-size: 16px; }';
      const expected = '.test { font-size: var(--base-size); }';
      expect(
        await run(input, {
          convert: () => 'var(--base-size)',
        })
      ).toBe(expected);
    });
  });

  describe('comment-based disable', () => {
    it('should skip conversion with pxtorem-disable-line inline comment', async () => {
      const input = '.test { font-size: 16px; /* pxtorem-disable-line */ }';
      const expected = '.test { font-size: 16px; /* pxtorem-disable-line */ }';
      expect(await run(input)).toBe(expected);
    });

    it('should convert values without disable comment', async () => {
      const input = '.test { font-size: 16px; margin: 16px; }';
      const expected = '.test { font-size: 1rem; margin: 1rem; }';
      expect(await run(input)).toBe(expected);
    });
  });

  describe('onConversionComplete callback', () => {
    it('should call onConversionComplete with report', async () => {
      const onConversionComplete = vi.fn();
      const input = '.test { font-size: 16px; margin: 16px; }';
      await run(input, { onConversionComplete });

      expect(onConversionComplete).toHaveBeenCalledTimes(1);
      const report: ConversionReport = onConversionComplete.mock.calls[0][0];
      expect(report.totalDeclarations).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should convert px fallback value inside var()', async () => {
      const input = '.test { font-size: var(--font-size-text, 16px); }';
      const expected = '.test { font-size: var(--font-size-text, 1rem); }';
      expect(await run(input, { properties: ['*'] })).toBe(expected);
    });

    it('should convert nested var() fallback px values', async () => {
      const input =
        '.test { font-size: var(--a, var(--b, 16px)); margin: var(--m, 8px); }';
      const expected =
        '.test { font-size: var(--a, var(--b, 1rem)); margin: var(--m, 0.5rem); }';
      expect(await run(input, { properties: ['*'] })).toBe(expected);
    });

    it('should not convert px text in var() custom property names', async () => {
      const input = '.test { font-size: var(--font-size-16px, 8px); }';
      const expected = '.test { font-size: var(--font-size-16px, 0.5rem); }';
      expect(await run(input, { properties: ['*'] })).toBe(expected);
    });

    it('should not convert values in url()', async () => {
      const input =
        '.test { background: url(image-16px.png); font-size: 16px; }';
      const expected =
        '.test { background: url(image-16px.png); font-size: 1rem; }';
      expect(await run(input, { properties: ['*'] })).toBe(expected);
    });

    it('should not convert values in single quotes', async () => {
      const input = ".test { content: '16px'; font-size: 16px; }";
      const expected = ".test { content: '16px'; font-size: 1rem; }";
      expect(await run(input, { properties: ['*'] })).toBe(expected);
    });

    it('should not convert values in double quotes', async () => {
      const input = '.test { content: "16px"; font-size: 16px; }';
      const expected = '.test { content: "16px"; font-size: 1rem; }';
      expect(await run(input, { properties: ['*'] })).toBe(expected);
    });

    it('should handle mixed values', async () => {
      const input = '.test { padding: 16px 8px 4px 2px; }';
      const expected = '.test { padding: 1rem 0.5rem 0.25rem 0.125rem; }';
      expect(await run(input, { properties: ['*'] })).toBe(expected);
    });
  });
});
