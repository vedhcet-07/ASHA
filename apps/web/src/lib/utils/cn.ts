/**
 * Tiny className combiner — joins truthy values, later classes win ties.
 * Keeps primitives composable without adding a dependency.
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(' ');
}
