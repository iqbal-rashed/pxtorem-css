import type { Plugin, Root, Declaration, AtRule, ChildNode } from 'postcss';
import type {
  Options,
  ResolvedOptions,
  ConversionReport,
  TargetUnit,
} from './types';
import { createPixelUnitRegex } from './lib/pixel-unit-regex';
import { createPropListMatcher } from './lib/filter-prop-list';
import { isFunction, isString } from './lib/type';
import { isConversionDisabled } from './lib/comment-parser';

export type { Options, ConversionReport, TargetUnit } from './types';

const defaults: ResolvedOptions = {
  baseSize: 16,
  precision: 5,
  skipSelectors: [],
  properties: ['*'],
  replaceOriginal: true,
  convertMediaQueries: false,
  minValue: 0,
  maxValue: Infinity,
  excludeFiles: null,
  includeFiles: null,
  fromUnit: 'px',
  toUnit: 'rem',
  propertyBaseSize: {},
  disableNextLineComment: 'pxtorem-disable-next-line',
  disableLineComment: 'pxtorem-disable-line',
  disableBlockComment: 'pxtorem-disable',
  enableBlockComment: 'pxtorem-enable',
  convert: null,
  onConversionComplete: null,
  verbose: false,
};

/**
 * Round a number to a specific precision
 */
function toFixed(number: number, precision: number): number {
  const multiplier = Math.pow(10, precision + 1);
  const wholeNumber = Math.floor(number * multiplier);
  return (Math.round(wholeNumber / 10) * 10) / multiplier;
}

/**
 * Check if a declaration with the same prop and value already exists
 */
function declarationExists(
  decls: Declaration[],
  prop: string,
  value: string
): boolean {
  return decls.some((decl) => decl.prop === prop && decl.value === value);
}

/**
 * Check if a selector should be skipped
 */
function shouldSkipSelector(
  skipList: (string | RegExp)[],
  selector: string | undefined
): boolean {
  if (typeof selector !== 'string') return false;
  return skipList.some((pattern) => {
    if (typeof pattern === 'string') {
      return selector.indexOf(pattern) !== -1;
    }
    return pattern.test(selector);
  });
}

/**
 * Check if file matches a pattern
 */
function matchesPattern(
  filePath: string | undefined,
  pattern: string | RegExp | ((file: string) => boolean) | null
): boolean {
  if (!pattern || !filePath) return false;
  if (isFunction(pattern)) return pattern(filePath);
  if (isString(pattern)) return filePath.indexOf(pattern) !== -1;
  if (pattern instanceof RegExp) return pattern.test(filePath);
  return false;
}

/**
 * Creates a function that converts px values to target unit values
 */
function createValueConverter(
  baseSize: number,
  precision: number,
  minValue: number,
  maxValue: number,
  toUnit: TargetUnit,
  property: string,
  selector: string,
  propertyBaseSize: Record<string, number>,
  convertFn: ResolvedOptions['convert'],
  report: { converted: number; skipped: number },
  verbose: boolean
): (match: string, pixels: string | undefined) => string {
  // Use property-specific baseSize if defined
  const effectiveBaseSize = propertyBaseSize[property] ?? baseSize;

  return (match: string, pixels: string | undefined): string => {
    if (!pixels) return match;
    const pixelValue = parseFloat(pixels);

    // Check min/max bounds
    if (pixelValue < minValue || pixelValue > maxValue) {
      report.skipped++;
      return match;
    }

    // Apply custom convert function if provided
    if (convertFn) {
      const result = convertFn(pixelValue, property, selector);
      if (result === false) {
        report.skipped++;
        return match;
      }
      if (typeof result === 'string') {
        report.converted++;
        if (verbose) {
          console.log(
            `[pxtorem-css] ${property}: ${match} → ${result} (custom)`
          );
        }
        return result;
      }
      if (typeof result === 'number') {
        const fixedVal = toFixed(result, precision);
        report.converted++;
        if (verbose) {
          console.log(
            `[pxtorem-css] ${property}: ${match} → ${fixedVal}${toUnit} (custom)`
          );
        }
        return fixedVal + toUnit;
      }
    }

    const fixedVal = toFixed(pixelValue / effectiveBaseSize, precision);
    report.converted++;

    if (verbose) {
      console.log(`[pxtorem-css] ${property}: ${match} → ${fixedVal}${toUnit}`);
    }

    return fixedVal + toUnit;
  };
}

/**
 * PostCSS plugin that converts px to rem/em/vw/vh units
 *
 * @example
 * ```js
 * import pxtorem from 'pxtorem-css';
 *
 * postcss([
 *   pxtorem({
 *     baseSize: 16,
 *     properties: ['*'],
 *     toUnit: 'rem'
 *   })
 * ])
 * ```
 */
function pxtorem(options: Options = {}): Plugin {
  const opts: ResolvedOptions = { ...defaults, ...options } as ResolvedOptions;
  const satisfyPropList = createPropListMatcher(opts.properties);

  let isExcludedFile = false;
  let currentBaseSize: number;
  let currentFilePath: string | undefined;

  // Conversion tracking
  const report: ConversionReport = {
    totalDeclarations: 0,
    convertedDeclarations: 0,
    skippedDeclarations: 0,
    filesProcessed: [],
    details: new Map(),
  };

  return {
    postcssPlugin: 'pxtorem-css',

    Once(css: Root) {
      currentFilePath = css.source?.input?.file;

      // Check include/exclude patterns
      if (opts.includeFiles && currentFilePath) {
        isExcludedFile = !matchesPattern(currentFilePath, opts.includeFiles);
      } else if (opts.excludeFiles && currentFilePath) {
        isExcludedFile = matchesPattern(currentFilePath, opts.excludeFiles);
      } else {
        isExcludedFile = false;
      }

      if (isExcludedFile) return;

      // Track file
      if (currentFilePath && !report.filesProcessed.includes(currentFilePath)) {
        report.filesProcessed.push(currentFilePath);
        report.details.set(currentFilePath, { converted: 0, skipped: 0 });
      }

      // Resolve baseSize
      currentBaseSize = isFunction(opts.baseSize)
        ? opts.baseSize(css.source!.input)
        : opts.baseSize;
    },

    Declaration(decl: Declaration) {
      if (isExcludedFile) return;

      report.totalDeclarations++;

      // Check if value contains source unit
      if (decl.value.indexOf(opts.fromUnit) === -1) {
        report.skippedDeclarations++;
        return;
      }

      // Check properties list
      if (!satisfyPropList(decl.prop)) {
        report.skippedDeclarations++;
        return;
      }

      // Check skipSelectors
      const selector =
        decl.parent?.type === 'rule'
          ? (decl.parent as { selector?: string }).selector
          : undefined;

      if (shouldSkipSelector(opts.skipSelectors, selector)) {
        report.skippedDeclarations++;
        return;
      }

      // Check for disable comments
      if (
        isConversionDisabled(
          decl as ChildNode,
          opts.disableNextLineComment,
          opts.disableLineComment,
          opts.disableBlockComment,
          opts.enableBlockComment
        )
      ) {
        report.skippedDeclarations++;
        if (opts.verbose) {
          console.log(
            `[pxtorem-css] Skipped (disabled): ${decl.prop}: ${decl.value}`
          );
        }
        return;
      }

      const fileReport = currentFilePath
        ? (report.details.get(currentFilePath) ?? { converted: 0, skipped: 0 })
        : { converted: 0, skipped: 0 };

      const pxRegex = createPixelUnitRegex(opts.fromUnit);
      const valueConverter = createValueConverter(
        currentBaseSize,
        opts.precision,
        opts.minValue,
        opts.maxValue,
        opts.toUnit,
        decl.prop,
        selector ?? '',
        opts.propertyBaseSize,
        opts.convert,
        fileReport,
        opts.verbose
      );

      const value = decl.value.replace(pxRegex, valueConverter);

      // Update report
      if (currentFilePath) {
        report.details.set(currentFilePath, fileReport);
      }
      report.convertedDeclarations += fileReport.converted;
      report.skippedDeclarations += fileReport.skipped;

      // Skip if value unchanged or already exists
      if (value === decl.value) return;
      if (
        decl.parent &&
        declarationExists(
          (decl.parent.nodes?.filter((n) => n.type === 'decl') ||
            []) as Declaration[],
          decl.prop,
          value
        )
      ) {
        return;
      }

      if (opts.replaceOriginal) {
        decl.value = value;
      } else {
        decl.cloneAfter({ value });
      }
    },

    AtRule(atRule: AtRule) {
      if (isExcludedFile) return;

      if (opts.convertMediaQueries && atRule.name === 'media') {
        if (atRule.params.indexOf(opts.fromUnit) === -1) return;

        const fileReport = currentFilePath
          ? (report.details.get(currentFilePath) ?? {
              converted: 0,
              skipped: 0,
            })
          : { converted: 0, skipped: 0 };

        const pxRegex = createPixelUnitRegex(opts.fromUnit);
        const valueConverter = createValueConverter(
          currentBaseSize,
          opts.precision,
          opts.minValue,
          opts.maxValue,
          opts.toUnit,
          '@media',
          '',
          opts.propertyBaseSize,
          opts.convert,
          fileReport,
          opts.verbose
        );

        atRule.params = atRule.params.replace(pxRegex, valueConverter);

        if (currentFilePath) {
          report.details.set(currentFilePath, fileReport);
        }
      }
    },

    OnceExit() {
      if (opts.onConversionComplete) {
        opts.onConversionComplete(report);
      }

      if (opts.verbose) {
        console.log('\n[pxtorem-css] Conversion Report:');
        console.log(`  Files: ${report.filesProcessed.length}`);
        console.log(`  Total: ${report.totalDeclarations}`);
        console.log(`  Converted: ${report.convertedDeclarations}`);
        console.log(`  Skipped: ${report.skippedDeclarations}\n`);
      }
    },
  };
}

pxtorem.postcss = true;

export { pxtorem };

export default pxtorem;
