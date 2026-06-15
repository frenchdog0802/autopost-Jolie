import { describe, expect, it } from 'vitest';
import { validateCaptionSet } from '../validateCaptionSet.js';
import { AIServiceError } from '../../types/errors.js';

describe('validateCaptionSet', () => {
  it('accepts valid caption JSON', () => {
    const result = validateCaptionSet({
      instagram: { caption: 'ig caption', hashtags: '#one' },
      facebook: { caption: 'fb caption', hashtags: '#two' },
      threads: { caption: 'th caption', hashtags: '#three' },
    });

    expect(result.instagram.caption).toBe('ig caption');
  });

  it('throws when a platform field is missing', () => {
    expect(() =>
      validateCaptionSet({
        instagram: { caption: 'ig', hashtags: '#one' },
        facebook: { caption: 'fb', hashtags: '#two' },
      }),
    ).toThrow(AIServiceError);
  });

  it('throws when caption is empty', () => {
    expect(() =>
      validateCaptionSet({
        instagram: { caption: '   ', hashtags: '#one' },
        facebook: { caption: 'fb', hashtags: '#two' },
        threads: { caption: 'th', hashtags: '#three' },
      }),
    ).toThrow(AIServiceError);
  });

  it('extracts hashtags from caption when hashtags field is missing', () => {
    const result = validateCaptionSet({
      instagram: { caption: 'Hello world #tag1 #tag2' },
      facebook: { caption: 'fb', hashtags: '#two' },
      threads: { caption: 'th', hashtags: '#three' },
    });

    expect(result.instagram.caption).toBe('Hello world');
    expect(result.instagram.hashtags).toBe('#tag1 #tag2');
  });

  it('accepts hashtags as an array', () => {
    const result = validateCaptionSet({
      instagram: { caption: 'ig', hashtags: ['#one', '#two'] },
      facebook: { caption: 'fb', hashtags: '#two' },
      threads: { caption: 'th', hashtags: '#three' },
    });

    expect(result.instagram.hashtags).toBe('#one #two');
  });
});
