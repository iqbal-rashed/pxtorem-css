/**
 * Type checking utilities
 */

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

export function isRegExp(value: unknown): value is RegExp {
  return value instanceof RegExp;
}
