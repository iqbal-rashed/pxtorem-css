/**
 * Creates a regex for matching pixel units while excluding quoted strings,
 * url(), and the custom-property name segment in var().
 *
 * Excluding regex trick: http://www.rexegg.com/regex-best-trick.html
 * - Not anything inside double quotes
 * - Not anything inside single quotes
 * - Not anything inside url()
 * - Not the var() custom-property name segment (var(--token...)
 * - Any digit followed by the specified unit
 */
export function createPixelUnitRegex(unit: string): RegExp {
  return new RegExp(
    `"[^"]+"|'[^']+'|url\\([^)]+\\)|var\\(\\s*--[^,)]*|(\\d*\\.?\\d+)${unit}`,
    'g'
  );
}
