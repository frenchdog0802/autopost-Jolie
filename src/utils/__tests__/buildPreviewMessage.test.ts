import { describe, expect, it } from 'vitest';
import { POSTBACK_ACTIONS } from '../../types/constants.js';
import { buildPreviewMessage } from '../buildPreviewMessage.js';

const captions = {
  instagram: { caption: 'IG text', hashtags: '#ig' },
  facebook: { caption: 'FB text', hashtags: '#fb' },
  threads: { caption: 'TH text', hashtags: '#th' },
};

describe('buildPreviewMessage', () => {
  it('includes all platform previews', () => {
    const message = buildPreviewMessage(captions);

    expect(message.text).toContain('IG text');
    expect(message.text).toContain('FB text');
    expect(message.text).toContain('TH text');
  });

  it('includes three Quick Reply postback actions', () => {
    const message = buildPreviewMessage(captions);
    const items = message.quickReply?.items ?? [];

    expect(items).toHaveLength(3);
    expect(items.map((item) => item.action.data)).toEqual([
      POSTBACK_ACTIONS.confirm,
      POSTBACK_ACTIONS.regenerate,
      POSTBACK_ACTIONS.cancel,
    ]);
  });
});
