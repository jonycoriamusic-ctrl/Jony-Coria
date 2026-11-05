import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Repository } from '../application/repository.js';
import type { DemoState } from '../domain/model.js';
import { seedState } from './seed.js';

/** Single-process demo persistence only; no claim of multi-process database isolation. */
export class JsonRepository implements Repository {
  private queue: Promise<unknown> = Promise.resolve();
  private state: DemoState | undefined;
  constructor(private file: string, private initial: () => DemoState = seedState) {}
  transact<T>(work: (state: DemoState) => T | Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      if (!this.state) {
        try { this.state = JSON.parse(await readFile(this.file, 'utf8')) as DemoState; }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; this.state = this.initial(); }
      }
      const next = structuredClone(this.state);
      const result = await work(next);
      await mkdir(dirname(this.file), { recursive: true });
      await writeFile(`${this.file}.tmp`, JSON.stringify(next), { mode: 0o600 });
      await rename(`${this.file}.tmp`, this.file);
      this.state = next;
      return structuredClone(result);
    });
    this.queue = run.catch(() => {});
    return run;
  }
}
