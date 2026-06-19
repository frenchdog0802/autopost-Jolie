import { describe, expect, it } from 'vitest';
import { buildPreviewMessage } from '../buildPreviewMessage.js';
import {
  captionsAreIdentical,
  parseEditedCaptions,
} from '../parseEditedCaptions.js';

describe('parseEditedCaptions', () => {
  it('applies plain text to all platforms', () => {
    const captions = parseEditedCaptions('new caption #tag');

    expect(captions).toEqual({
      instagram: { caption: 'new caption #tag', hashtags: '' },
      facebook: { caption: 'new caption #tag', hashtags: '' },
      threads: { caption: 'new caption #tag', hashtags: '' },
    });
  });

  it('parses pasted multi-platform preview without nesting', () => {
    const pasted = `請確認以下文案：

📸 Instagram
IG dinner caption
#ig #food

📘 Facebook
FB dinner caption
#fb

🧵 Threads
TH dinner caption
#th`;

    const captions = parseEditedCaptions(pasted);

    expect(captions.instagram).toEqual({
      caption: 'IG dinner caption',
      hashtags: '#ig #food',
    });
    expect(captions.facebook).toEqual({
      caption: 'FB dinner caption',
      hashtags: '#fb',
    });
    expect(captions.threads).toEqual({
      caption: 'TH dinner caption',
      hashtags: '#th',
    });
  });
});

describe('captionsAreIdentical', () => {
  it('returns true when all platforms match', () => {
    const captions = parseEditedCaptions('same text');
    expect(captionsAreIdentical(captions)).toBe(true);
  });

  it('returns false when platforms differ', () => {
    const captions = parseEditedCaptions(`📸 Instagram
IG

📘 Facebook
FB

🧵 Threads
TH`);
    expect(captionsAreIdentical(captions)).toBe(false);
  });
});

describe('buildPreviewMessage edit duplication fix', () => {
  it('shows unified caption once when all platforms are identical', () => {
    const captions = parseEditedCaptions('shared caption #tag');
    const message = buildPreviewMessage(captions);

    expect(message.text).toBe('請確認以下文案：\n\nshared caption #tag');
    expect(message.text.match(/shared caption #tag/g)).toHaveLength(1);
  });

  it('does not nest confirm header when pasted preview is parsed', () => {
    const pasted = `請確認以下文案：

📸 Instagram
IG text
#ig

📘 Facebook
FB text
#fb

🧵 Threads
TH text
#th`;
    const captions = parseEditedCaptions(pasted);
    const message = buildPreviewMessage(captions);

    expect((message.text.match(/請確認以下文案/g) ?? []).length).toBe(1);
    expect(message.text).toContain('IG text');
    expect(message.text).toContain('FB text');
    expect(message.text).toContain('TH text');
  });
});
