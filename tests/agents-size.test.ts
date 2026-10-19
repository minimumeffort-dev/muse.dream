import {it,expect} from 'vitest';
import {readFileSync,statSync} from 'node:fs';
// AGENTS.md is loaded whole as startup context (65536-byte subagent limit);
// per-slice invariants live in agent-invariants.md, read on demand.
it('keeps AGENTS.md under the startup-context limit with invariants one hop away',()=>{
 expect(statSync('AGENTS.md').size).toBeLessThanOrEqual(60000);
 expect(readFileSync('AGENTS.md','utf8')).toContain('agent-invariants.md');
 const invariants=readFileSync('agent-invariants.md','utf8');
 for(const heading of ['## Enterable ground floors','## Wind-safe city trees, r74','## Wildlife construction, r79'])expect(invariants).toContain(heading);
});
