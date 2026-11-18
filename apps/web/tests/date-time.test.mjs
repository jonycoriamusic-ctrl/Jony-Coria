import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { browserTimeZone, formatZonedDate } from '../src/lib/date-time.ts';
import { showLocalDateTime, showStartInstant } from '../src/lib/show-date-time.ts';
import { timeZoneOf } from '@musica/contracts';

const instant = '2026-11-18T00:30:00.000Z';
const argentinaZone = timeZoneOf('AR', 'Australia/Sydney');
const brisbaneZone = timeZoneOf('AU', 'Australia/Brisbane');

test('Argentina show time ignores the browser or a stale Australian profile zone', () => {
  assert.equal(argentinaZone, 'America/Argentina/Buenos_Aires');
  assert.deepEqual(showLocalDateTime(instant, argentinaZone), { day: '2026-11-17', time: '21:30' });
  assert.equal(showStartInstant('2026-11-17', '21:30', argentinaZone), instant);
  assert.equal(formatZonedDate(instant, 'es-AR', argentinaZone, {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }), '17/11/2026');
});

test('Australia show time uses the musician-selected city, including the correct calendar day', () => {
  assert.equal(brisbaneZone, 'Australia/Brisbane');
  assert.deepEqual(showLocalDateTime(instant, brisbaneZone), { day: '2026-11-18', time: '10:30' });
  assert.equal(showStartInstant('2026-11-18', '10:30', brisbaneZone), instant);
  assert.equal(formatZonedDate(instant, 'en', brisbaneZone, {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }), '18/11/2026');
});

test('personal timestamps use the viewer device zone, independent of display language', () => {
  const moduleUrl = new URL('../src/lib/date-time.ts', import.meta.url).href;
  const script = `import { browserTimeZone } from ${JSON.stringify(moduleUrl)}; process.stdout.write(browserTimeZone('America/Argentina/Buenos_Aires'));`;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, TZ: 'Australia/Brisbane' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'Australia/Brisbane');
  assert.match(formatZonedDate(instant, 'es-AR', result.stdout, true), /10:30/);
  assert.match(formatZonedDate(instant, 'en', result.stdout, true), /10:30/);
  assert.equal(browserTimeZone('America/Argentina/Buenos_Aires'), Intl.DateTimeFormat().resolvedOptions().timeZone);
});

test('invalid show dates are rejected before saving', () => {
  assert.equal(showStartInstant('2026-02-30', '21:00', argentinaZone), null);
  assert.equal(showStartInstant('2026-11-18', '25:00', brisbaneZone), null);
});
