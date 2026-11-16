import { mkdtempSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const sharpVersion = JSON.parse(readFileSync(join(root, 'node_modules/sharp/package.json'), 'utf8')).version;
if (sharpVersion !== '0.35.5') throw new Error(`Review Linux native package versions for sharp ${sharpVersion}.`);

const temporary = mkdtempSync(join(tmpdir(), 'musica-netlify-native-'));
try {
  for (const [name, version] of [['sharp-linux-x64', '0.35.5'], ['sharp-libvips-linux-x64', '1.3.4']]) {
    const packed = spawnSync('npm', ['pack', `@img/${name}@${version}`, '--pack-destination', temporary, '--json'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (packed.status !== 0) throw new Error(`Could not fetch @img/${name}: ${packed.stderr}`);
    const [{ filename }] = JSON.parse(packed.stdout);
    const destination = join(root, 'node_modules/@img', name);
    mkdirSync(destination, { recursive: true });
    const extracted = spawnSync('tar', ['-xzf', join(temporary, filename), '-C', destination, '--strip-components=1'], {
      cwd: root, stdio: 'inherit',
    });
    if (extracted.status !== 0) throw new Error(`Could not unpack @img/${name}.`);
  }
  console.log('Netlify Linux image binaries are ready.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
