import test from 'node:test';
import assert from 'node:assert/strict';
import { permanentQrUrl, readLastMenu, rememberLastMenu } from '../src/lib/last-menu.ts';

test('printable QR URLs stay on the permanent site when generated from a deploy preview', () => {
  assert.equal(permanentQrUrl('jony', 'https://branch--musicaalacarta.netlify.app'), 'https://musicaalacarta.netlify.app/q/jony');
  assert.equal(permanentQrUrl('jony', 'https://6afd3260feff077288d38fee--themusicmenu.netlify.app'), 'https://themusicmenu.netlify.app/q/jony');
  assert.equal(permanentQrUrl('jony', 'https://musicaalacarta.com.ar'), 'https://musicaalacarta.com.ar/q/jony');
  assert.equal(permanentQrUrl('jony', 'http://127.0.0.1:3000'), 'http://127.0.0.1:3000/q/jony');
  assert.throws(() => permanentQrUrl('../portal', 'https://musicaalacarta.netlify.app'));
});

test('the last successfully opened musician menu survives a browser reload', () => {
  const values = new Map();
  const originalWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    dispatchEvent: () => true,
  };
  try {
    assert.equal(readLastMenu(), null);
    rememberLastMenu({ slug: 'jony', stageName: 'Jony Coria' });
    assert.deepEqual(readLastMenu(), { slug: 'jony', stageName: 'Jony Coria' });
    values.set('musica.last-menu', JSON.stringify({ slug: '../portal', stageName: 'Fake' }));
    assert.equal(readLastMenu(), null);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
