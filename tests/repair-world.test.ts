import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import {createCarAtSpawn} from '../src/sim/car';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {repairTargets} from '../src/sim/repair';
it('repairs all three market furniture categories, then pays for a finite replacement-kit delivery',()=>{
 const scene=createWorldScene(),r=scene.economy!.repairs[0]!;
 expect(repairTargets(scene,r).map(t=>t.objectId).sort()).toEqual(['market_planter','picnic_table','produce_crate']);
 let s={...createCarAtSpawn(scene),broken:['market_planter','picnic_table','produce_crate']};
 for(let i=0;i<700;i++){s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);checkEconomyState(s,scene);}
 expect(s.broken).toEqual([]);expect(s.economy!.repaired.market_tables).toBe(3);expect(s.economy!.markets.find(m=>m.id==='market_stall')!.stock.timber).toBe(9);expect(s.economy!.accounts.find(a=>a.id==='caretaker')!.credits).toBe(12);expect(s.economy!.accounts.find(a=>a.id==='caretaker')!.repair).toBeUndefined();
 s={...s,control:{kind:'foot'},x:11000,y:4140,elevation:0};s=stepCommerce({...s,timeS:s.timeS+.25},{commerce:{kind:'collect',delivery:'kits_run'}},.25,scene);expect(s.economy!.accounts[0]!.delivery?.id).toBe('kits_run');checkEconomyState(s,scene);
 s={...s,x:6400,y:4330};s=stepCommerce({...s,timeS:s.timeS+.25},{commerce:{kind:'deliver'}},.25,scene);
 expect(s.economy!.markets.find(m=>m.id==='market_stall')!.stock.timber).toBe(11);expect(s.economy!.markets.find(m=>m.id==='station_supplies')).toMatchObject({credits:6,stock:{timber:30}});expect(s.economy!.accounts[0]!.credits).toBe(24);expect(s.economy!.delivered.kits_run).toBe(1);checkEconomyState(s,scene);
},60000);
