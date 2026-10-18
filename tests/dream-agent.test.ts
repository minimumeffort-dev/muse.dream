import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {dreamAgentContext,DREAM_AGENT_FEATURES} from '../src/scene/dream-agent';
import {DREAM_V2_CONTRACT} from '../src/scene/dream-contract';
import {modelContext,DEFAULT_PROMPT} from '../src/authoring/prompt';
import instructions from '../docs/dream-v2-model.txt?raw';

describe('bounded agent context packets',()=>{
  it('gives standalone scenarios a small, complete vocabulary without geometry',()=>{
    const packet=dreamAgentContext(['scenarios']);
    expect(packet.features).toEqual(['scenarios']);
    expect(Object.keys(packet.contract.commands)).toEqual(['scenario','item','location','link','stock','service','agent','objective']);
    expect(packet.contract).toMatchObject({version:2,limits:DREAM_V2_CONTRACT.limits,projectLimits:DREAM_V2_CONTRACT.projectLimits,scenarios:DREAM_V2_CONTRACT.scenarios});
    expect(packet.instructions).toContain('standalone scenario');
    expect(packet.instructions).toContain('compileDreamScene');
    expect(packet.instructions).not.toContain('## objects');
    expect(JSON.stringify(packet).length).toBeLessThan((instructions.length+JSON.stringify(DREAM_V2_CONTRACT).length)*.15);
    expect(modelContext(DEFAULT_PROMPT)).toMatchObject({...packet,prompt:DEFAULT_PROMPT});
    for(const prompt of [' ', 'a'.repeat(4001)])expect(()=>modelContext(prompt)).toThrow('1–4,000');
  });
  it('includes the city vocabulary required by courier and repair grounds',()=>{
    const packet=dreamAgentContext(['commerce']);expect(packet.features).toContain('city');
    for(const command of ['account','meal','delivery','surface','street','crossing','site'])expect(packet.contract.commands).toHaveProperty(command);
    expect(packet.instructions).toContain('NPC resupply:');expect(packet.instructions).toContain('NPC meal trips');expect(packet.contract.commands.account!.fields.meal).toBe('ref?');expect(packet.contract.commands.account!.fields.deliveries).toBe('symbols?');
  });
  it('adds required features once in deterministic order',()=>{
    const packet=dreamAgentContext(['sports','population','lighting']);
    expect(packet).toEqual(dreamAgentContext(['lighting','population','sports','sports']));
    expect(packet.features).toEqual(['objects','world','modules','interactions','city','npcs','population','lighting','sports']);
    for(const command of ['part','measure','impact','break','furnish','street','world','route','site','stop','sport','behavior','lamp'])expect(packet.contract.commands).toHaveProperty(command);
    expect(packet.contract.commands).not.toHaveProperty('scenario');
    expect(packet.contract.commands).not.toHaveProperty('voxels');
    expect(packet.instructions.match(/## objects/g)).toHaveLength(1);
  });
  it('covers the complete compiler contract and every instruction with all features',()=>{
    const packet=dreamAgentContext(['all']);
    expect(packet.contract).toEqual(DREAM_V2_CONTRACT);
    expect(packet.features).toEqual(Object.keys(DREAM_AGENT_FEATURES));
    const originalSections=instructions.split(/^## [a-z]+\n/m).filter(s=>s.trim());
    for(const section of originalSections)expect(packet.instructions).toContain(section.trim());
    for(const name of packet.availableFeatures)expect(dreamAgentContext([name]).instructions).toContain('## '+name+'\n');
    expect(dreamAgentContext()).toEqual(dreamAgentContext(['objects']));
    packet.availableFeatures.pop();
    expect(dreamAgentContext(['all']).availableFeatures).toEqual(Object.keys(DREAM_AGENT_FEATURES));
  });
  it('includes the required world clock when authoring markets with service hours',()=>{
    const packet=dreamAgentContext(['commerce']);expect(packet.contract.commands.market!.fields.hours).toBe('v2?');expect(packet.contract.commands).toHaveProperty('daylight');expect(packet.instructions).toContain('simulation time');expect(packet.contract).toMatchObject({commerce:{hours:{source:'market(...,hours=[open_hour,close_hour])'}}});
  });
  it.each([[],['unknown'],['__proto__'],['constructor'],['all','objects'],Array(17).fill('objects')].map(features=>[features]))('rejects invalid feature requests: %j',features=>{
    expect(()=>dreamAgentContext(features)).toThrow();
  });
  it('exports machine-readable CLI context and preserves source/check boundaries',()=>{
    const run=(...args:string[])=>JSON.parse(execFileSync(process.execPath,['scripts/dream.mjs',...args],{encoding:'utf8'}));
    expect(run('context','--features','scenarios')).toEqual(dreamAgentContext(['scenarios']));
    expect(run('context')).toEqual(dreamAgentContext());
    const path='docs/examples/material-components.dream',source=readFileSync(path,'utf8');
    expect(run('check',path)).toMatchObject({ok:true,assemblies:2,parts:10,fullWorld:false});
    for(const args of [['context','--features','bad'],['context','--features'],['context','--features','objects','--features','world'],['context',path],['context','--write'],['context','--modules','src/scene/world'],['contract','--features','objects']]){
      const result=spawnSync(process.execPath,['scripts/dream.mjs',...args],{encoding:'utf8'});
      expect(result.status,args.join(' ')).toBe(1);expect(result.stderr).toBe('');
      expect(JSON.parse(result.stdout)).toMatchObject({ok:false,diagnostics:[{code:args.includes('bad') ? 'E_CONTEXT' : 'E_USAGE'}]});
    }
    expect(readFileSync(path,'utf8')).toBe(source);
  },30000);
});
