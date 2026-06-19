/**
 * Parse user-entered dish names (one dish per line, blank lines ignored).
 * Returns null when no valid dishes are found.
 */
export function parseManualDishes(text: string): string[] | null {
  const dishes = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (dishes.length === 0 || dishes.length > 5) {
    return null;
  }

  return dishes;
}
