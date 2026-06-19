import { AIServiceError } from '../types/errors.js';

const MIN_DISHES = 1;
const MAX_DISHES = 5;

/**
 * Validate OpenAI JSON output for dish recognition.
 */
export function validateDishList(raw: unknown): string[] {
  if (typeof raw !== 'object' || raw === null) {
    throw new AIServiceError('AI response is not a JSON object');
  }

  const record = raw as Record<string, unknown>;
  const dishes = record.dishes;

  if (!Array.isArray(dishes)) {
    throw new AIServiceError('AI response missing dishes array');
  }

  const names = dishes
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  if (names.length < MIN_DISHES || names.length > MAX_DISHES) {
    throw new AIServiceError(
      `Dish count must be between ${MIN_DISHES} and ${MAX_DISHES}`,
    );
  }

  return names;
}
