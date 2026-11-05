import type { DemoState } from '../domain/model.js';
/** Atomic application boundary. A Firebase adapter will replace the demo implementation. */
export interface Repository { transact<T>(work: (state: DemoState) => T | Promise<T>): Promise<T> }
