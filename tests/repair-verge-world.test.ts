import {it,expect} from 'vitest';
import {createWorldScene,worldSource,worldModules} from '../src/scene/world-fixture';
import {compileDreamScene} from '../src/scene/dream';
import {repairTargets,repairApproach,repairNetwork} from '../src/sim/repair';
import {crossingPolygons,crossingLanes} from '../src/scene/sites';
import {onPolygon} from '../src/scene/streets';
const scene=createWorldScene(),r=scene.economy!.repairs[0]!;
it('serves every declared city target and routes the four formerly isolated lamps through a real crossing',()=>{
 const targets=repairTargets(scene,r),lamps=targets.filter(t=>{const spec=scene.objects.find(o=>o.id===t.objectId)!.spec;return spec && 'measure' in spec && spec.measure?.kind==='lamp';});expect(targets).toHaveLength(431);expect(lamps).toHaveLength(413);expect(scene.objects).toHaveLength(1773);expect(scene.crossings).toHaveLength(58);
 const crossing=scene.crossings.find(c=>c.id==='repair_high_south')!,polygons=crossingPolygons(scene,crossing),home=scene.objects.find(o=>o.id==='market_neighbor')!;expect(crossingLanes(scene,crossing)).toHaveLength(4);
 for(const id of ['center_lamps_1_16_l','center_lamps_1_16_r','center_lamps_1_17_l','center_lamps_1_17_r']){const route=repairApproach(scene,r,targets.find(t=>t.objectId===id)!,home)!;expect(route).toBeDefined();let crossed=false,previous:{x:number;y:number}=home;for(const p of route.path){const steps=Math.ceil(Math.hypot(p.x-previous.x,p.y-previous.y)/2);for(let i=0;i<=steps;i++){const t=steps ? i/steps : 0,x=previous.x+(p.x-previous.x)*t,y=previous.y+(p.y-previous.y)*t;if(polygons.some(q=>onPolygon(q,x,y)))crossed=true;}previous=p;}expect(crossed,id).toBe(true);}
 const nav=repairNetwork(scene,r);expect(nav.length).toBeLessThanOrEqual(8192);expect(nav.reduce((n,p)=>n+p.links.length,0)).toBeLessThanOrEqual(32768);
});
it('rejects the same service coverage when its real street crossing is removed',()=>{
 const missing=worldSource.replace(/crossing repair_high_south[^;]*;/,'');expect(()=>compileDreamScene(missing,{sceneId:'missing-crossing',revisionId:'r1',sourceHash:'missing'},worldModules)).toThrow('repair-not-connected');
},60000);
