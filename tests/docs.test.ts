import liveLife from '../src/scene/world/life.dream?raw';
import {worldModules} from '../src/scene/world-fixture';
import liveMarket from '../src/scene/world/market_interior.dream?raw';
import {describe,it,expect} from "vitest";
import {checkDream} from "../src/scene/dream";
import {DREAM_V2_COMMANDS} from "../src/scene/dream-contract";

const pages=import.meta.glob<string>(['../README.md','../docs/README.md','../docs/dream-language.md','../docs/dream/*.md'],{query:'?raw',import:'default',eager:true});
const examples=import.meta.glob<string>('../docs/examples/*.dream',{query:'?raw',import:'default',eager:true});
const files=Object.keys(import.meta.glob(['../src/**/*','../docs/**/*','../scripts/*','../tests/**/*','../README.md'])).map(p=>p.slice(3));

describe("published Dream documentation",()=>{
  it('keeps the residential lounge declarations identical to the complete runnable world',()=>{const blocks=[...pages['../docs/dream/residential-lounge.md']!.matchAll(/```dream\n([\s\S]*?)```/g)].map(m=>m[1]!.trim());expect(blocks).toHaveLength(2);for(const block of blocks)expect(examples['../docs/examples/residential-lounge.dream']).toContain(block);});
  it('keeps the paid service excerpts identical to their runnable customer world',()=>{const guide=pages['../docs/dream/service-work.md']!,block=guide.split('## Customers make the work')[1]!.match(/```dream\n([\s\S]*?)```/)![1]!.trim();for(const line of block.split('\n'))expect(examples['../docs/examples/service-visits.dream']).toContain(line);});
  it('keeps the supported lobby and mezzanine declarations identical to their runnable sources',()=>{
    const blocks=[...pages['../docs/dream/station-quarter.md']!.matchAll(/```dream\n([\s\S]*?)```/g)].map(m=>m[1]!.trim());
    expect(blocks).toHaveLength(2);expect(blocks.find(b=>b.startsWith('dream 2;'))).toBe(examples['../docs/examples/ground-floor-seating.dream']!.trim());
    expect(examples['../docs/examples/tower-mezzanine.dream']).toContain(blocks.find(b=>b.startsWith('floor mezzanine')));
  });
  it('keeps the company declaration identical to its complete runnable world',()=>{const snippets=[...pages['../docs/dream/company.md']!.matchAll(/```dream\n([\s\S]*?)```/g)].map(m=>m[1]!.trim());expect(snippets).toHaveLength(1);expect(examples['../docs/examples/company-needs.dream']).toContain(snippets[0]);});
  it('keeps upstairs workstation declarations identical to their complete runnable source',()=>{
    const blocks=[...pages['../docs/dream/upstairs-work.md']!.matchAll(/```dream\n([\s\S]*?)```/g)];expect(blocks).toHaveLength(3);for(const block of blocks)expect(examples['../docs/examples/upstairs-work.dream']).toContain(block[1]!.trim());
  });
  it('keeps peer recipe declarations identical to their complete runnable source',()=>{
    const declaration=pages['../docs/dream/companion-recipes.md']!.match(/```dream\n([\s\S]*?)```/)![1]!.trim();expect(examples['../docs/examples/companion-recipes.dream']).toContain(declaration);
  });
  it('keeps workstation declarations identical to the complete runnable source',()=>{
    const snippets=[...pages['../docs/dream/workstations.md']!.matchAll(/```dream\n([\s\S]*?)```/g)];expect(snippets).toHaveLength(2);
    for(const snippet of snippets)expect(examples['../docs/examples/workstations.dream']).toContain(snippet[1]!.trim());
  });
  it('keeps relationship qualifications identical to the complete runnable source',()=>{
    const declaration=pages['../docs/dream/relationships.md']!.match(/```dream\n([\s\S]*?)```/)![1]!.trim();expect(examples['../docs/examples/shared-recipe.dream']).toContain(declaration);
  });
  it('keeps the shelter declaration identical to the complete runnable source',()=>{
    const declaration=pages['../docs/dream/shelter.md']!.match(/```dream\n([\s\S]*?)```/)![1]!.trim();expect(examples['../docs/examples/rain-shelter.dream']).toContain(declaration);
  });
  it('keeps daily attendance identical to the complete runnable source',()=>{
    const declaration=pages['../docs/dream/attendance.md']!.match(/```dream\n([\s\S]*?)```/)![1]!.trim();expect(examples['../docs/examples/scheduled-workday.dream']).toContain(declaration);
  });
  it('keeps floor bindings identical to the complete runnable upstairs example',()=>{
    const declaration=pages['../docs/dream/floors.md']!.match(/```dream\n([\s\S]*?)```/)![1]!.trim();expect(examples['../docs/examples/upstairs-rest.dream']).toContain(declaration);
  });
  it('keeps the stair declaration identical to its runnable source and linked live house',()=>{
    const guide=pages['../docs/dream/stairs.md']!,declaration=guide.match(/```dream\n([\s\S]*?)```/)![1]!.trim();expect(examples['../docs/examples/stairs-home.dream']).toContain(declaration);expect(worldModules.destructible).toContain(declaration);
  });
  it('keeps the nursery declaration identical to its complete runnable example',()=>{
    const section=pages['../docs/dream/businesses.md']!.split('## Nursery work')[1]!;
    expect(examples['../docs/examples/sapling-propagation.dream']).toContain(section.match(/```dream\n([\s\S]*?)```/)![1]!.trim());
  });
  it('keeps the fixture-hardware policy identical to its runnable example',()=>{
    const section=pages['../docs/dream/businesses.md']!.split('## Reuse fixture hardware')[1]!;
    const declaration=section.match(/```dream\n([\s\S]*?)```/)![1]!.trim();expect(examples['../docs/examples/hardware-recovery.dream']).toContain(declaration);
  });
  it('keeps the complete counter-hours guide identical to its runnable world',()=>{
    const blocks=[...pages['../docs/dream/hours.md']!.matchAll(/```dream\n([\s\S]*?)```/g)].map(m=>m[1]!.trim());
    expect(blocks).toContain(examples['../docs/examples/market-hours.dream']!.trim());
  });
  it('keeps the complete business guide identical to its independently runnable world',()=>{
    const blocks=[...pages['../docs/dream/businesses.md']!.matchAll(/```dream\n([\s\S]*?)```/g)].map(m=>m[1]!.trim());
    expect(blocks).toContain(examples['../docs/examples/market-production.dream']!.trim());
  });
  it('keeps the complete meal guide identical to its runnable world',()=>{
    const blocks=[...pages['../docs/dream/commerce.md']!.matchAll(/```dream\n([\s\S]*?)```/g)].map(m=>m[1]!.trim());
    expect(blocks).toContain(examples['../docs/examples/meal-trips.dream']!.trim());
  });
  it('keeps the complete personal-progression guide identical to its runnable world',()=>{
    const blocks=[...pages['../docs/dream/commerce.md']!.matchAll(/```dream\n([\s\S]*?)```/g)].map(m=>m[1]!.trim());
    expect(blocks).toContain(examples['../docs/examples/work-progression.dream']!.trim());
  });
  it('keeps both complete food and workshop recipes identical to their runnable world',()=>{
    const blocks=[...pages['../docs/dream/commerce.md']!.matchAll(/```dream\n([\s\S]*?)```/g)].map(m=>m[1]!.trim());
    expect(blocks).toContain(examples['../docs/examples/multi-input-work.dream']!.trim());
  });
  it('keeps the complete interior guide, runnable example and live market identical',()=>{
    const example=examples['../docs/examples/enterable-market.dream']!.trim(),blocks=[...pages['../docs/dream/interiors.md']!.matchAll(/```dream\n([\s\S]*?)```/g)].map(m=>m[1]!.trim());
    expect(blocks).toContain(example);expect(liveMarket.trim()).toBe(example);
  });
  it('keeps the connected-path guide identical to its runnable source',()=>{const blocks=[...pages['../docs/dream/paths.md']!.matchAll(/```dream\n([\s\S]*?)```/g)].map(m=>m[1]!.trim());expect(blocks).toContain(examples['../docs/examples/park-paths.dream']!.trim());});
  it('keeps the parking guide identical to its runnable source',()=>{
    const blocks=[...pages['../docs/dream/populations.md']!.matchAll(/```dream\n([\s\S]*?)```/g)].map(m=>m[1]!.trim());
    expect(blocks).toContain(examples['../docs/examples/parked-vehicles.dream']!.trim());
  });
  it('keeps planting and recovery declarations identical to their respective complete examples',()=>{
    const sections=pages['../docs/dream/growth.md']!.split('## Timber recovery');
    for(const [i,path] of ['orchard-replanting','timber-recovery'].entries()){
      const declarations=[...sections[i]!.matchAll(/```dream\n([\s\S]*?)```/g)].flatMap(m=>m[1]!.trim().split('\n'));
      expect(declarations.length).toBeGreaterThan(0);for(const declaration of declarations)expect(examples[`../docs/examples/${path}.dream`]).toContain(declaration);
    }
  });
  it('keeps courier declarations identical to their runnable source',()=>{
    const section=pages['../docs/dream/commerce.md']!.split('## NPC supply trips')[1]!;
    const declarations=section.match(/```dream\n([\s\S]*?)```/)![1]!.trim().split('\n');
    for(const declaration of declarations)expect(examples['../docs/examples/courier-resupply.dream']).toContain(declaration.trim());
    const live=pages['../docs/dream/commerce.md']!.split('### Replacement supplies')[1]!.split('### Connected service grounds')[0]!;
    for(const line of live.match(/```dream\n([\s\S]*?)```/)![1]!.trim().split('\n'))expect(liveLife).toContain(line.trim());
  });
  it('keeps the commerce guide identical to its complete runnable world',()=>{
    const block=pages['../docs/dream/commerce.md']!.match(/```dream\n([\s\S]*?)```/)![1]!;
    expect(block.trim()).toBe(examples['../docs/examples/market-work.dream']!.trim());
  });
  it.each(Object.entries(examples))("compiles the complete example %s",(path,source)=>{
    const result=checkDream(source,['/character-import.dream','/ground-floor-seating.dream','/residential-lounge.dream','/tower-mezzanine.dream','/service-office.dream','/service-office-meals.dream','/recurring-service.dream','/service-visits.dream'].some(name=>path.endsWith(name)) ? worldModules : {});
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
