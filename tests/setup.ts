import {afterEach} from 'vitest';
import {setImmediate} from 'node:timers/promises';

// Pure scene/geometry suites are CPU-heavy. Let queued worker reports reach
// Vitest between tests instead of starving its IPC channel on slower runners.
afterEach(async()=>{await setImmediate();});
