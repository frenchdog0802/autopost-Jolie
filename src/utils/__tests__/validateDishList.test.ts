import { describe, expect, it } from 'vitest';
import { AIServiceError } from '../../types/errors.js';
import { validateDishList } from '../validateDishList.js';

describe('validateDishList', () => {
  it('accepts 1 to 5 non-empty dish names', () => {
    expect(validateDishList({ dishes: ['滷肉飯'] })).toEqual(['滷肉飯']);
    expect(validateDishList({ dishes: ['a', 'b', 'c', 'd', 'e'] })).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ]);
  });

  it('trims dish names', () => {
    expect(validateDishList({ dishes: [' 滷肉飯 ', '雞腿排'] })).toEqual([
      '滷肉飯',
      '雞腿排',
    ]);
  });

  it('throws for empty or oversized dish lists', () => {
    expect(() => validateDishList({ dishes: [] })).toThrow(AIServiceError);
    expect(() =>
      validateDishList({ dishes: ['a', 'b', 'c', 'd', 'e', 'f'] }),
    ).toThrow(AIServiceError);
  });
});
