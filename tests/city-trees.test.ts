import {it,expect} from 'vitest';
import * as THREE from 'three';
import example from '../docs/examples/city-tree-replanting.dream?raw';
import working from '../docs/evidence/city-repairs/native-work.json?raw';
import oldTrees from '../src/scene/compatibility/r73-trees.json';
import {createWorldScene} from '../src/scene/world-fixture';
import {compileDreamScene} from '../src/scene/dream';
import {preFleetScene,preTreeScene,preTreeCompatibilitySource,preEquipmentCompatibilitySource,sha256,TREE_COMPATIBILITY,COVERAGE_COMPATIBILITY} from '../src/scene/save-compatibility';
import {pooledImpact,impactBudget} from '../src/scene/damage-pool';
import {objectContacts,sceneContactData} from '../src/scene/contacts';
import {objectPlacement} from '../src/scene/placement';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {repairTargets,repairApproach,repairSegment,repairNetwork,repairArea} from '../src/sim/repair';
import {workPath} from '../src/sim/work-navigation';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {breakOnContact,advanceImpactMotion} from '../src/sim/impacts';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {WorldScenery} from '../src/game/scenery';
import {disposeChunk} from '../src/game/chunk-packet';
import {drivingReviewStart} from '../src/game/review-start';
const scene=preFleetScene(createWorldScene()),previous={...preTreeScene(scene),sourceHash:oldTrees.source,revisionId:'r73'},trees=scene.objects.filter(o=>o.spec && 'measure' in o.spec && o.spec.measure?.kind==='tree'),service=scene.economy!.repairs.find(r=>r.id==='orchard_trees')!;
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:TREE_COMPATIBILITY,previousTreeSaveCompatibility:COVERAGE_COMPATIBILITY},oldWorld:World={...world,scene:previous,saveCompatibility:COVERAGE_COMPATIBILITY,previousTreeSaveCompatibility:undefined};

it('makes every measured city tree independently topple through one shared rule without changing its construction',()=>{
 const policy=scene.interactionRules.find(r=>r.kind==='tree')!;expect(trees).toHaveLength(345);
 const old=new Map(previous.objects.map(o=>[o.id,o]));
 for(const tree of trees){const spec=tree.spec!;expect(spec && 'impact' in spec && spec.impact).toEqual(policy.impact);expect(pooledImpact(scene,tree),tree.id).toBe(true);
  const strip=(o:typeof tree)=>{const {impact,parts,...s}=o.spec as any;return {...o,spec:{...s,parts:parts.map(({fragment,...p}:any)=>p)}};};expect(strip(tree)).toEqual(strip(old.get(tree.id)!));
 }
 expect(impactBudget(scene)).toEqual({templates:30,fragments:72,resident:12,residentFragments:27,pooledTemplates:18});expect(scene.objects).toHaveLength(1769);expect(sceneContactData(scene).contacts).toEqual(sceneContactData(previous).contacts);expect(ambientGraph(scene).nodes).toEqual(ambientGraph(previous).nodes);
 const first=createCarAtSpawn(scene);
 for(const tree of trees){const contact=objectContacts(scene,tree)[0]!,state={...first,x:tree.x-contact.r-10,y:tree.y,elevation:objectPlacement(scene,tree).base,vx:200,vy:0,broken:[],debris:[],impacts:[]};breakOnContact(state,world,tree.x-contact.r,tree.y,[contact]);expect(state.broken,tree.id).toEqual([tree.id]);expect(state.debris,tree.id).toHaveLength(1);}
 expect(first.broken).toEqual([]);
});

it('covers every furnished street tree, retains finite supplies and proves each selected worker approach',()=>{
 const targets=repairTargets(scene,service),street=trees.filter(o=>/^(center|garden|waterfront)_trees_/.test(o.id)),home=scene.objects.find(o=>o.id==='market_neighbor')!;
 expect(targets).toHaveLength(106);expect(street).toHaveLength(93);expect(street.every(o=>targets.some(t=>t.objectId===o.id))).toBe(true);expect(targets.some(t=>t.objectId==='garden_rowan_north')).toBe(true);expect(targets.length).toBeLessThan(trees.length);
 expect(service).toMatchObject({input:'sapling',take:1,seconds:10,pay:6,effort:6,regrow_s:180,seed_scale:.15});expect(scene.economy!.accounts).toBe(previous.economy!.accounts);expect(scene.economy!.markets).toBe(previous.economy!.markets);
 for(const target of targets){const approach=repairApproach(scene,service,target,home);expect(approach,target.objectId).toBeDefined();let p:{x:number;y:number}=home;for(const q of approach!.path){expect(repairSegment(scene,service,p,q,undefined),target.objectId).toBe(true);p=q;}}
 const nodes=repairNetwork(scene,service);expect(nodes).toHaveLength(5380);expect(nodes.reduce((n,p)=>n+p.links.length,0)).toBe(20422);
});

it('routes the airport approach through a supported corner rather than cutting diagonally across the road',()=>{
 const target=repairTargets(scene,service).find(t=>t.objectId==='ecology_032')!,home=scene.objects.find(o=>o.id==='market_neighbor')!,approach=repairApproach(scene,service,target,home)!,area=repairArea(scene,service),unchanged=JSON.stringify(scene);
 expect(workPath(scene,{...area,id:'without_corners',wideAccess:false},home,approach.end)).toBeUndefined();
 const forward=workPath(scene,area,home,approach.end),back=workPath(scene,area,approach.end,home);expect(forward).toBeDefined();expect(back).toBeDefined();expect(JSON.stringify(scene)).toBe(unchanged);
});

it('preserves every native r73 repair field and old slot through the exact registered projection',async()=>{
 expect(await sha256(preEquipmentCompatibilitySource(scene))).toBe(TREE_COMPATIBILITY);expect(await sha256(preTreeCompatibilitySource(scene))).toBe(COVERAGE_COMPATIBILITY);
 const changed={...scene,objects:scene.objects.map(o=>o.id==='garden_rowan_north' ? {...o,x:o.x+1} : o)};expect(await sha256(preTreeCompatibilitySource(changed))).not.toBe(COVERAGE_COMPATIBILITY);
 const before=decodeSave(working,oldWorld),after=decodeSave(working,world);expect(after.state).toEqual(before.state);expect(after.worldTime).toBe(before.worldTime);expect(after.migrated).toBe(true);
 const oldKey=`muse-dream.save.v17.${scene.sceneId}.${COVERAGE_COMPATIBILITY}`,rows=new Map([[oldKey,working]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.migrated).toBe(true);expect(slot.write(after.state,after.worldTime)).toBe(true);expect(rows.get(oldKey)).toBe(working);expect(rows.size).toBe(2);
 expect(()=>decodeSave(working,{...world,previousTreeSaveCompatibility:undefined})).toThrow('different world');expect(()=>decodeSave(working,{...world,saveCompatibility:'a'.repeat(64)})).toThrow();
});

it('retains an old sapling fall and independently saves a newly damaged wind tree',()=>{
 const old=previous.objects.find(o=>o.id==='orchard_sapling')!,contact=objectContacts(previous,old)[0]!,state={...createCarAtSpawn(previous),x:old.x-contact.r-10,y:old.y,elevation:objectPlacement(previous,old).base,vx:200,vy:0};breakOnContact(state,oldWorld,old.x-contact.r,old.y,[contact]);advanceImpactMotion(state,oldWorld,.2,false);
 const encoded=encodeSave(state,27,oldWorld),restored=decodeSave(encoded,world);expect(restored.state).toEqual(JSON.parse(encoded).state);expect(restored.state.debris[0]!.lifetime).toBe(7);
 const tree=trees.find(o=>o.id==='garden_rowan_north')!,c=objectContacts(scene,tree)[0]!,next={...restored.state,x:tree.x-c.r-10,y:tree.y,elevation:objectPlacement(scene,tree).base,vx:200,vy:0};breakOnContact(next,world,tree.x-c.r,tree.y,[c]);expect(next.broken).toContain(tree.id);expect(decodeSave(encodeSave(next,27,world),world).state.broken).toEqual(next.broken);
 const start=drivingReviewStart(createCarAtSpawn(scene),world,'street-tree');expect([start.x,start.y]).toEqual([tree.x,tree.y-140]);
});

it('keeps intact instance geometry, wind and material programs identical across the tree policy change',()=>{
 const unique=new Map<string,typeof trees[number]>();for(const o of trees)unique.set(JSON.stringify(o.spec),o);
 for(const object of unique.values()){
  const before=new WorldScenery(previous,[previous.objects.find(o=>o.id===object.id)!]),after=new WorldScenery(scene,[object]);
  expect(after.group.children).toHaveLength(before.group.children.length);
  for(let i=0;i<before.group.children.length;i++){const a=before.group.children[i] as THREE.InstancedMesh,b=after.group.children[i] as THREE.InstancedMesh;expect(b.instanceMatrix.array).toEqual(a.instanceMatrix.array);expect(b.geometry.index?.array).toEqual(a.geometry.index?.array);for(const [name,attribute] of Object.entries(a.geometry.attributes))expect(b.geometry.getAttribute(name).array).toEqual(attribute.array);expect((b.material as THREE.Material).customProgramCacheKey()).toBe((a.material as THREE.Material).customProgramCacheKey());}
  disposeChunk(before.group);disposeChunk(after.group);
 }
});

it('accepts the complete voxel wind-tree and wide replanting example through world validation',()=>{
 const doc=compileDreamScene(example,{sceneId:'wind-trees',revisionId:'r1',sourceHash:'test'}),r=doc.economy!.repairs.find(r=>r.id==='tree_care')!;expect(doc.damagePool).toBe(true);expect(doc.voxelWorld).toBeDefined();expect(r.verge).toBe(112);expect(repairTargets(doc,r)).toHaveLength(2);expect(doc.objects.find(o=>o.id==='remote_tree')!.spec && pooledImpact(doc,doc.objects.find(o=>o.id==='remote_tree')!)).toBe(true);
});
