/**
 * Format dish names for LINE display (one dish per line).
 */
export function formatDishList(dishes: string[]): string {
  return dishes.join('\n');
}
