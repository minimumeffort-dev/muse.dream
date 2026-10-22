import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import {preTreeScene,preCityScene,preInteriorScene,prePlantScene,prePlantCompatibilitySource,sha256,VERGE_COMPATIBILITY} from '../src/scene/save-compatibility';
import {createCarAtSpawn} from '../src/sim/car';
import {repairTargets,repairApproach,repairNetwork} from '../src/sim/repair';
import {actorContacts} from '../src/sim/actors';
import {distanceToRoad} from '../src/scene/road';
import {ambientGraph} from '../src/scene/ambient-navigation';
const scene=createWorldScene(),r=scene.economy!.repairs.find(r=>r.id==='orchard_trees')!;
it('connects the orchard through its actual garden path and preserves the previous physical world',async()=>{
 expect(scene.objects).toHaveLength(1778);expect(scene.crossings).toHaveLength(58);expect(scene.surfaces).toHaveLength(53);expect(scene.surfaces.some(s=>s.id==='hall_service')).toBe(true);const prior=preTreeScene(scene),old=prior.economy!.repairs.find(r=>r.id==='orchard_trees')!;expect(repairTargets(prior,old).map(t=>t.objectId)).toEqual(['orchard_birch','meadow_spruce','orchard_sapling']);expect(await sha256(prePlantCompatibilitySource(preCityScene(scene)))).toBe(VERGE_COMPATIBILITY);expect(ambientGraph(preInteriorScene(preCityScene(scene)))).toEqual(ambientGraph(prePlantScene(preCityScene(scene))));
 const home=scene.objects.find(o=>o.id==='market_neighbor')!;for(const target of repairTargets(scene,r))expect(repairApproach(scene,r,target,home)).toBeDefined();const graph=repairNetwork(scene,r);expect(graph.length).toBeLessThanOrEqual(8192);expect(graph.reduce((n,p)=>n+p.links.length,0)).toBeLessThanOrEqual(32768);
});
it('chooses a different pavement route around the authored bicycle rather than waiting forever on that sidewalk',()=>{
 const home=scene.objects.find(o=>o.id==='market_neighbor')!,s=createCarAtSpawn(scene),bike=actorContacts(scene,0,s).find(c=>c.id==='village_bike')!,target=repairTargets(scene,r).find(t=>t.objectId==='orchard_birch')!,ordinary=repairApproach(scene,r,target,home)!,detour=repairApproach(scene,r,target,home,s)!;
 const blocked=(path:{x:number;y:number}[])=>{let previous={x:home.x,y:home.y};return path.some(p=>{const overlap=distanceToRoad([previous,p],bike.x,bike.y)<bike.r+4-.001;previous=p;return overlap;});};expect(blocked(ordinary.path)).toBe(true);expect(detour).toBeDefined();expect(blocked(detour.path)).toBe(false);
});
