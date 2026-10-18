import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import {createCarAtSpawn} from '../src/sim/car';
import {stepCommerce,checkEconomyState,commerceReason} from '../src/sim/commerce';
import {repairTargets} from '../src/sim/repair';
it('shares damage across all 405 lamps, repairs neighborhood furniture, keeps paid player procurement available while the worker returns',()=>{
 const scene=createWorldScene(),r=scene.economy!.repairs[0]!;
 const lamps=scene.objects.filter(o=>o.spec && 'measure' in o.spec && o.spec.measure?.kind==='lamp');expect(lamps).toHaveLength(405);expect(scene.damagePool).toBe(true);expect(new Set(lamps.map(o=>o.spec!.displayName)).size).toBe(2);for(const o of lamps){const spec=o.spec as import('../src/scene/object-dsl').ObjectDslV2;expect(spec.impact).toEqual({kind:'topple',speed:95,duration:1,lifetime:8});expect(spec.contacts).toHaveLength(1);expect(spec.contacts![0]!.position).toEqual([0,0,0]);expect([1.2,1.4]).toContain(spec.contacts![0]!.radius);}

 expect(repairTargets(scene,r)).toHaveLength(90);expect(repairTargets(scene,r).map(t=>t.objectId)).toEqual(expect.arrayContaining(['hall_table_west','hall_table_east','hall_bench','hall_produce_crate','market_planter','park_bench','park_wall_east','park_wall_west','picnic_table','produce_crate','south_lamps_4_1_r','station_bench','school_bench']));
 let s={...createCarAtSpawn(scene),broken:['market_planter','picnic_table','produce_crate']};
 for(let i=0;i<700;i++){s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);checkEconomyState(s,scene);if(s.economy!.repaired.market_tables===3)break;}
 expect(s.broken).toEqual([]);expect(s.economy!.repaired.market_tables).toBe(3);expect(s.economy!.markets.find(m=>m.id==='market_stall')!.stock.timber).toBe(9);expect(s.economy!.accounts.find(a=>a.id==='caretaker')!.credits).toBe(12);expect(s.economy!.accounts.find(a=>a.id==='caretaker')!.repair?.phase).toBe('home');expect(s.economy!.accounts.find(a=>a.id==='caretaker')!.courier).toBeUndefined();
 s={...s,control:{kind:'foot'},x:11000,y:4140,elevation:0};expect(commerceReason(s,scene,'pocket',{kind:'collect',delivery:'kits_run'})).toBeUndefined();s=stepCommerce({...s,timeS:s.timeS+.25},{commerce:{kind:'collect',delivery:'kits_run'}},.25,scene);expect(s.economy!.accounts[0]!.delivery?.id).toBe('kits_run');checkEconomyState(s,scene);
 s={...s,x:6400,y:4330};s=stepCommerce({...s,timeS:s.timeS+.25},{commerce:{kind:'deliver'}},.25,scene);
 expect(s.economy!.markets.find(m=>m.id==='market_stall')!.stock.timber).toBe(11);expect(s.economy!.markets.find(m=>m.id==='station_supplies')).toMatchObject({credits:6,stock:{timber:30}});expect(s.economy!.accounts[0]!.credits).toBe(24);expect(s.economy!.delivered.kits_run).toBe(1);checkEconomyState(s,scene);
},60000);

it('prepares the rendered crossing review through actual driving, damage and dispatch with valid saved state',async()=>{
 const {maintenanceReviewStart}=await import('../src/game/review-start'),{buildMaskForScene}=await import('../src/scene/fixture'),{buildPaperMask}=await import('../src/sim/mask'),{encodeSave}=await import('../src/sim/save');
 const scene=createWorldScene(),world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11},s=maintenanceReviewStart(createCarAtSpawn(scene),world),task=s.economy!.accounts.find(a=>a.id==='caretaker')!.repair!;
 expect(s.timeS).toBeCloseTo(44);expect(s.broken).toContain('park_bench');expect(task.phase).toBe('out');expect(task.objectId).toBe('park_wall_west');expect(task.distance).toBeGreaterThan(100);expect(s.control.kind).toBe('foot');expect(Math.hypot(s.x-task.x,s.y-task.y)).toBeGreaterThan(40);expect(()=>encodeSave(s,s.timeS,world)).not.toThrow();
},60000);
