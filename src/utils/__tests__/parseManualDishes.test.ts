import { describe, expect, it } from 'vitest';
import { parseManualDishes } from '../parseManualDishes.js';

describe('parseManualDishes', () => {
  it('parses valid dish lines', () => {
    expect(
      parseManualDishes('菜色1: 滷肉飯\n菜色2: 雞腿排\n菜色3: 燙青菜'),
    ).toEqual(['滷肉飯', '雞腿排', '燙青菜']);
  });

  it('returns null for comma-separated input', () => {
    expect(parseManualDishes('滷肉飯、雞腿排')).toBeNull();
  });

  it('returns null for more than five dishes', () => {
    expect(
      parseManualDishes(
        '菜色1: a\n菜色2: b\n菜色3: c\n菜色4: d\n菜色5: e\n菜色6: f',
      ),
    ).toBeNull();
  });
});
