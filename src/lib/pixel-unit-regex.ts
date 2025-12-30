/**
 * Creates a regex for matching pixel units while excluding quoted strings, url(), and var()
 *
 * Excluding regex trick: http://www.rexegg.com/regex-best-trick.html
 * - Not anything inside double quotes
 * - Not anything inside single quotes
 * - Not anything inside url()
 * - Not anything inside var()
 * - Any digit followed by the specified unit
 */
export function createPixelUnitRegex(unit: string): RegExp {
  return new RegExp(
    `"[^"]+"|'[^']+'|url\\([^)]+\\)|var\\([^)]+\\)|(\\d*\\.?\\d+)${unit}`,
    'g'
  );
}
