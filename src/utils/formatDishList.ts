/**
 * Format dish names for LINE display (菜色1: xxx).
 */
export function formatDishList(dishes: string[]): string {
  return dishes
    .map((dish, index) => `菜色${index + 1}: ${dish}`)
    .join('\n');
}
