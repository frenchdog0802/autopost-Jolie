const DISH_LINE_PATTERN = /^菜色\d+:\s*(.+)$/;

/**
 * Parse user-entered dish lines (菜色1: xxx format).
 * Returns null when no valid dishes are found.
 */
export function parseManualDishes(text: string): string[] | null {
  const dishes = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(DISH_LINE_PATTERN);
      return match?.[1]?.trim() ?? '';
    })
    .filter(Boolean);

  if (dishes.length === 0 || dishes.length > 5) {
    return null;
  }

  return dishes;
}
