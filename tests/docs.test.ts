import {describe,it,expect} from "vitest";
import {checkDream} from "../src/scene/dream";
import {DREAM_V2_COMMANDS} from "../src/scene/dream-contract";

const pages=import.meta.glob<string>(['../README.md','../docs/README.md','../docs/dream-language.md','../docs/dream/*.md'],{query:'?raw',import:'default',eager:true});
const examples=import.meta.glob<string>('../docs/examples/*.dream',{query:'?raw',import:'default',eager:true});
const files=Object.keys(import.meta.glob(['../src/**/*','../docs/**/*','../scripts/*','../tests/**/*','../README.md'])).map(p=>p.slice(3));

describe("published Dream documentation",()=>{
  it('keeps the commerce guide identical to its complete runnable world',()=>{
    const block=pages['../docs/dream/commerce.md']!.match(/```dream\n([\s\S]*?)```/)![1]!;
    expect(block.trim()).toBe(examples['../docs/examples/market-work.dream']!.trim());
  });
  it.each(Object.entries(examples))("compiles the complete example %s",(path,source)=>{
    const result=checkDream(source);
    expect(result.ok,result.ok ? path : JSON.stringify(result.diagnostics)).toBe(true);
  });
  it("keeps the quickstart's complete tree identical to its runnable source",()=>{
    const example=pages['../docs/dream/quickstart.md']!.match(/```dream\n([\s\S]*?)```/)![1]!;
    expect(example.trim()).toBe(examples['../docs/examples/toppling-tree.dream']!.trim());
  });
  it('keeps the material-parameter example identical to its runnable source',()=>{
    const blocks=[...pages['../docs/dream/examples.md']!.matchAll(/```dream\n([\s\S]*?)```/g)].map(m=>m[1]!.trim());
    expect(blocks).toContain(examples['../docs/examples/material-components.dream']!.trim());
  });
  it("keeps the object's complete wood example identical to its runnable source",()=>{
    const example=pages['../docs/dream/objects.md']!.match(/```dream\n(dream 2;[\s\S]*?)```/)![1]!;
    expect(example.trim()).toBe(examples['../docs/examples/tapered-wood.dream']!.trim());
  });
  it("keeps the wildlife guide's complete example identical to its runnable source",()=>{
    const example=pages['../docs/dream/behavior.md']!.match(/```dream\n([\s\S]*?)```/)![1]!;
    expect(example.trim()).toBe(examples['../docs/examples/ambient-wildlife.dream']!.trim());
  });
  it("keeps the NPC guide identical to its runnable module",()=>{
    const example=pages['../docs/dream/npcs.md']!.match(/```dream\n([\s\S]*?)```/)![1]!;
    expect(example.trim()).toBe(examples['../docs/examples/npc-behavior.dream']!.trim());
  });
  it('keeps the complete conversation example identical to the runnable source',()=>{
    const blocks=[...pages['../docs/dream/npcs.md']!.matchAll(/```dream\n([\s\S]*?)```/g)].map(m=>m[1]!.trim());
    expect(blocks).toContain(examples['../docs/examples/npc-conversation.dream']!.trim());
  });
  it('keeps the scenario guide identical to its complete runnable source',()=>{
    const example=pages['../docs/dream/scenarios.md']!.match(/```dream\n([\s\S]*?)```/)![1]!;
    expect(example.trim()).toBe(examples['../docs/examples/town-scenario.dream']!.trim());
  });
  it("keeps the city crossing identical to its complete runnable source",()=>{
    const blocks=[...pages['../docs/dream/worlds.md']!.matchAll(/```dream\n([\s\S]*?)```/g)].map(m=>m[1]!.trim());
    expect(blocks).toContain(examples['../docs/examples/city-cycle-lanes.dream']!.trim());
  });
  it.each(Object.entries(pages))("keeps local links and images valid in %s",(path,source)=>{
    for(const match of source.matchAll(/\]\(([^)]+)\)/g)){
      const target=match[1]!.split('#')[0]!;
      if(!target || /^https?:/.test(target))continue;
      const local=new URL(target,new URL(path.slice(3),'https://docs.local/')).pathname.slice(1);
      expect(files.some(p=>p===local || p.startsWith(local+'/')),`${path}: ${target}`).toBe(true);
    }
  });
  it("covers every parser command in the readable reference",()=>{
    const reference=pages['../docs/dream/reference.md']!;
    for(const command of Object.keys(DREAM_V2_COMMANDS))expect(reference).toContain('| `'+command+'` |');
  });
});
