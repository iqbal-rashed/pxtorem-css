import type { Input } from 'postcss';

/**
 * Supported target units for conversion
 */
export type TargetUnit = 'rem' | 'em' | 'vw' | 'vh' | 'vmin' | 'vmax' | '%';

/**
 * Conversion report generated after processing
 */
export interface ConversionReport {
  /** Total number of declarations processed */
  totalDeclarations: number;
  /** Number of declarations converted */
  convertedDeclarations: number;
  /** Number of declarations skipped */
  skippedDeclarations: number;
  /** List of files processed */
  filesProcessed: string[];
  /** Conversion details per file */
  details: Map<string, { converted: number; skipped: number }>;
}

/**
 * Options for the pxtorem-css plugin
 */
export interface Options {
  /**
   * Base font size for conversion calculation
   * @default 16
   */
  baseSize?: number | ((input: Input) => number);

  /**
   * Decimal precision for converted values
   * @default 5
   */
  precision?: number;

  /**
   * Properties to convert. Supports wildcards and negation.
   * - `['*']` - all properties
   * - `['font*']` - properties starting with font
   * - `['*size']` - properties ending with size
   * - `['!border*']` - exclude properties starting with border
   * @default ['*']
   */
  properties?: string[];

  /**
   * Selectors to skip. Strings check for containment, RegExp for matches.
   * @default []
   */
  skipSelectors?: (string | RegExp)[];

  /**
   * Replace values instead of adding fallbacks
   * @default true
   */
  replaceOriginal?: boolean;

  /**
   * Convert px in media queries
   * @default false
   */
  convertMediaQueries?: boolean;

  /**
   * Minimum px value to convert. Values below this are skipped.
   * @default 0
   */
  minValue?: number;

  /**
   * Maximum px value to convert. Values above this are skipped.
   * @default Infinity
   */
  maxValue?: number;

  /**
   * File paths to exclude from conversion
   */
  excludeFiles?: string | RegExp | ((file: string) => boolean) | null;

  /**
   * File paths to include for conversion (overrides excludeFiles)
   */
  includeFiles?: string | RegExp | ((file: string) => boolean) | null;

  /**
   * Source unit to convert from
   * @default 'px'
   */
  fromUnit?: string;

  /**
   * Target unit to convert to
   * @default 'rem'
   */
  toUnit?: TargetUnit;

  /**
   * Property-specific base sizes. Overrides baseSize for specified properties.
   * @example { 'font-size': 14, 'line-height': 20 }
   */
  propertyBaseSize?: Record<string, number>;

  /**
   * Comment pattern to disable conversion for next line
   * @default 'pxtorem-disable-next-line'
   */
  disableNextLineComment?: string;

  /**
   * Comment pattern to disable conversion for current line
   * @default 'pxtorem-disable-line'
   */
  disableLineComment?: string;

  /**
   * Comment pattern to disable conversion for block
   * @default 'pxtorem-disable'
   */
  disableBlockComment?: string;

  /**
   * Comment pattern to re-enable conversion after disable
   * @default 'pxtorem-enable'
   */
  enableBlockComment?: string;

  /**
   * Custom conversion function.
   * Return a number for calculated value, string for custom output, or false to skip.
   * @param pixelValue - The original pixel value
   * @param property - The CSS property name
   * @param selector - The CSS selector
   * @returns Custom value or false to skip
   */
  convert?: (
    pixelValue: number,
    property: string,
    selector: string
  ) => number | string | false;

  /**
   * Callback when processing is complete with conversion report
   */
  onConversionComplete?: (report: ConversionReport) => void;

  /**
   * Log conversion details to console
   * @default false
   */
  verbose?: boolean;
}

/**
 * Internal resolved options with all defaults applied
 */
export interface ResolvedOptions {
  baseSize: number | ((input: Input) => number);
  precision: number;
  properties: string[];
  skipSelectors: (string | RegExp)[];
  replaceOriginal: boolean;
  convertMediaQueries: boolean;
  minValue: number;
  maxValue: number;
  excludeFiles: string | RegExp | ((file: string) => boolean) | null;
  includeFiles: string | RegExp | ((file: string) => boolean) | null;
  fromUnit: string;
  toUnit: TargetUnit;
  propertyBaseSize: Record<string, number>;
  disableNextLineComment: string;
  disableLineComment: string;
  disableBlockComment: string;
  enableBlockComment: string;
  convert:
    | ((
        pixelValue: number,
        property: string,
        selector: string
      ) => number | string | false)
    | null;
  onConversionComplete: ((report: ConversionReport) => void) | null;
  verbose: boolean;
}
