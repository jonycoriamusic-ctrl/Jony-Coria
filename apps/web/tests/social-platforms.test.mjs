import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOCIAL_PLATFORMS, socialPlatform } from '../src/lib/social-platforms.tsx';

test('social picker covers music, mainstream and messaging links without duplicate platforms', () => {
  const names = SOCIAL_PLATFORMS.map(({ name }) => name.toLowerCase());
  assert.equal(new Set(names).size, names.length);
  for (const name of ['Spotify', 'Apple Music', 'SoundCloud', 'Bandcamp', 'Instagram', 'TikTok', 'LinkedIn', 'Telegram', 'Discord', 'Signal']) {
    const platform = socialPlatform(name);
    assert.ok(platform, `${name} should be selectable`);
    assert.equal(typeof platform.icon, 'function');
  }
});

test('existing labels resolve to their icons while custom services stay custom', () => {
  assert.equal(socialPlatform('Linkedin')?.name, 'LinkedIn');
  assert.equal(socialPlatform('sound cloud')?.name, 'SoundCloud');
  assert.equal(socialPlatform('Twitter')?.name, 'X');
  assert.equal(socialPlatform('My local fan club'), undefined);
});
