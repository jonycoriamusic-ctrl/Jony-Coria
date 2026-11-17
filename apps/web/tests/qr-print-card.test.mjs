import assert from 'node:assert/strict';
import test from 'node:test';
import { socialHandle } from '../src/lib/qr-print-card.ts';

test('social labels use real handles and do not invent one for channel links', () => {
  assert.equal(socialHandle({ platform: 'Instagram', url: 'https://www.instagram.com/jonycoria/' }), 'IG · @jonycoria');
  assert.equal(socialHandle({ platform: 'YouTube', url: 'https://youtube.com/@jonycoria' }), 'YT · @jonycoria');
  assert.equal(socialHandle({ platform: 'YouTube', url: 'https://youtube.com/channel/UC123' }), 'YT · youtube.com/channel/UC123');
});
