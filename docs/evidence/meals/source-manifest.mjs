// Run from the repository root after the implementation is final.
import {execFileSync} from 'node:child_process';import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex'),files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(f=>f && (f.startsWith('src/') || ['index.html','package.json','package-lock.json','vite.config.ts','scripts/media-middleware.ts','docs/dream-v2-model.txt','docs/dream-v2-contract.json'].includes(f))).sort();
const sources=[];for(const file of files)sources.push({file,sha256:hash(await readFile(file))});const replay=JSON.parse(await readFile('docs/evidence/meals/journey.json'));
await writeFile('docs/evidence/meals/source-manifest.json',JSON.stringify({baseline:'0cb26465450208c6de6cc621b948e24bd8370ece',runtimeSourceSha256:hash(JSON.stringify(sources)),worldSourceSha256:replay.sourceHash,simulationVersion:16,saveFormat:11,compatibility:replay.compatibilityHash,sources},null,2)+'\n');
console.log({files:sources.length,runtimeSourceSha256:hash(JSON.stringify(sources))});
