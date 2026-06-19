import { describe, expect, it } from 'vitest';
import { parseManualDishes } from '../parseManualDishes.js';

describe('parseManualDishes', () => {
  it('parses one dish per line', () => {
    expect(parseManualDishes('滷肉飯\n雞腿排\n燙青菜')).toEqual([
      '滷肉飯',
      '雞腿排',
      '燙青菜',
    ]);
  });

  it('ignores blank lines between dishes', () => {
    expect(parseManualDishes('滷肉飯\n\n雞腿排\n\n燙青菜')).toEqual([
      '滷肉飯',
      '雞腿排',
      '燙青菜',
    ]);
  });

  it('returns null for empty input', () => {
    expect(parseManualDishes('')).toBeNull();
    expect(parseManualDishes('   \n  ')).toBeNull();
  });

  it('returns null for more than five dishes', () => {
    expect(parseManualDishes('a\nb\nc\nd\ne\nf')).toBeNull();
  });
});
