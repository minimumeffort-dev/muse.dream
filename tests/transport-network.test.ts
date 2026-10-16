import {describe,it,expect} from 'vitest';
import {Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {compileDreamWorld,formatDream} from '../src/scene/dream';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {createWorldScene} from '../src/scene/world-fixture';
import {parseScene,type Scene} from '../src/scene/schema';
import {streetSchema,streetRects,streetRidingRects,cycleBands,unionRects,inRect,bridgeFitsStreet,onStreet} from '../src/scene/streets';
import {validateScenePlayability} from '../src/scene/validate';
import {navigableWater,drivingHeight,terrainHeight,terrainSurfaceHeight} from '../src/scene/terrain';
import {waterSchema,watercourseSchema} from '../src/scene/landscape-dsl';
import {buildStreets} from '../src/game/streets';
import {roadGeometry,roadMarkingGeometry} from '../src/game/environment';
import {WorldLandscape} from '../src/game/landscape';
import {WaterWaves} from '../src/sim/waves';
import {createCarAtSpawn,stepCar,type World,type CarState} from '../src/sim/car';
import {stepInteractive,toggleRide} from '../src/sim/interaction';
import {buildPaperMask} from '../src/sim/mask';
import {drivingReviewStart} from '../src/game/review-start';
import example from '../docs/examples/city-cycle-lanes.dream?raw';

const fixture=parseScene({...createFixtureScene(),objects:[],regions:[],terrain:{hills:[]}});
const main=streetSchema.parse({id:'main',width:100,cycleWidth:20,sidewalk:20,points:[{x:480,y:130},{x:480,y:620}]});
const cross=streetSchema.parse({...main,id:'cross',points:[{x:250,y:400},{x:730,y:400}]});
const bridge={id:'crossing',a:{x:480,y:220},b:{x:480,y:580},width:220,archHeight:30,style:'stone' as const,rails:true};
const water=waterSchema.parse({id:'canal',polygon:[{x:300,y:340},{x:660,y:340},{x:660,y:460},{x:300,y:460}],level:0,depth:12,bankWidth:24,color:'#447799',flow:{x:0,y:0},dragPerS:2,waves:{speed:55,damping:1,strength:1}});
const doc=(extra:Partial<Scene>={})=>parseScene({...fixture,streets:[main],...extra});
const world=createWorldScene(),context:World={scene:world,roadMask:buildMaskForScene(world),driveMask:buildPaperMask(world.canonical.width,world.canonical.height),carRadius:11};

describe('street cycle tracks',()=>{
 it('round-trips named lane fields and keeps omitted lanes backward compatible',()=>{
  const source='dream 2;street lane(width=100,sidewalk=20,points=[[200,200],[700,200]],cycle_width=20);';
  expect(compileDreamWorld(source).streets[0]!.cycleWidth).toBe(20);
  expect(compileDreamWorld(formatDream(source))).toEqual(compileDreamWorld(source));
  expect(compileDreamWorld(source.replace(',cycle_width=20','')).streets[0]).not.toHaveProperty('cycleWidth');
  for(const width of [0,15,41,NaN])expect(streetSchema.safeParse({...main,cycleWidth:width}).success).toBe(false);
  expect(compileDreamWorld(example)).toEqual(compileDreamWorld(formatDream(example)));
 });
 it('reserves two lanes, separators and sidewalks without paving across junctions',()=>{
  const streets=[main,cross],riding=streetRidingRects(streets),walks=unionRects(streetRects(streets,true),riding),bands=unionRects(cycleBands(streets));
  expect(streetRidingRects([main])[0]).toMatchObject({x0:404,x1:556});
  expect(streetRects([main],true)[0]).toMatchObject({x0:384,x1:576});
  expect(bands.some(r=>inRect(r,546,300))).toBe(true);
  expect(bands.some(r=>inRect(r,546,400))).toBe(true);
  expect(walks.some(r=>inRect(r,546,400))).toBe(false);
  expect(walks.some(r=>inRect(r,566,300))).toBe(true);
  expect(onStreet(doc(),546,300)).toBe(true);expect(onStreet(doc(),566,300)).toBe(false);
 });
 it('rejects objects or ground finishes that occupy a cycle track',()=>{
  const blocked=doc({objects:[{id:'obstacle',kind:'tree',labelText:'TREE',x:550,y:300,scale:1}]});
  expect(validateScenePlayability(blocked,buildMaskForScene(blocked),11).some(p=>p.message.includes('obstructed'))).toBe(true);
  const covered=doc({surfaces:[{id:'turf',color:'#557744',points:[{x:540,y:280},{x:560,y:280},{x:560,y:320},{x:540,y:320}]}]});
  expect(validateScenePlayability(covered,buildMaskForScene(covered),11).some(p=>p.message.includes('overlaps a street'))).toBe(true);
 });
 it('requires bridges to carry the full lane and sidewalk cross-section',()=>{
  const scene=doc({terrain:{hills:[],landscape:{dslVersion:1,waters:[water],bridges:[bridge]}}});
  expect(bridgeFitsStreet(scene,bridge)).toBe(true);
  expect(bridgeFitsStreet(scene,{...bridge,width:180})).toBe(false);
  expect(bridgeFitsStreet(scene,{...bridge,a:{x:510,y:220},b:{x:510,y:580}})).toBe(false);
  expect(bridgeFitsStreet(doc({streets:[main,cross]}),bridge)).toBe(false);
  const absent=doc({terrain:{hills:[],landscape:{dslVersion:1,waters:[water],bridges:[]}}});
  expect(validateScenePlayability(absent,buildMaskForScene(absent),11).some(p=>p.message.includes('full-width connected bridge'))).toBe(true);
 });
 it('projects cycle tracks and glyphs onto the same terrain as the street',()=>{
  const scene=doc({terrain:{hills:[{id:'hill',x:480,y:330,radiusX:300,radiusY:300,height:40}]}}),group=buildStreets(scene);
  for(const [name,lift] of [['street-cycle-tracks',1.4],['cycle-symbols',1.85]] as const){
   let vertices=0;group.getObjectByName(name)!.traverse(node=>{if(!(node instanceof Mesh))return;const p=node.geometry.getAttribute('position');for(let i=0;i<p.count;i++){expect(p.getY(i)).toBeCloseTo(terrainSurfaceHeight(scene.terrain,p.getX(i)+480,p.getZ(i)+360)+lift,4);vertices++;}});
   expect(vertices).toBeGreaterThan(0);
  }
  const ray=new Raycaster(new Vector3(66,600,-231),new Vector3(0,-1,0)),material=new MeshBasicMaterial();
  const original=new Mesh(roadGeometry(fixture),material);expect(ray.intersectObject(original).length).toBeGreaterThan(0);
  for(const geometry of [roadGeometry(doc()),roadMarkingGeometry(doc())]){expect(ray.intersectObject(new Mesh(geometry,material))).toHaveLength(0);geometry.dispose();}
  original.geometry.dispose();material.dispose();
 });
});

describe('connected larger world',()=>{
 it('connects cycling destinations through one street network and removes the isolated meadow oval',()=>{
  expect(world.canonical).toMatchObject({width:12000,height:10000});expect(world.routes.some(r=>r.id==='meadow_cycle')).toBe(false);
  const cycling=world.streets.filter(s=>s.cycleWidth),rects=streetRidingRects(cycling),visited=new Set([0]);
  for(let pass=0;pass<rects.length;pass++)rects.forEach((r,i)=>{if(rects.some((other,j)=>visited.has(j)&&r.x0<=other.x1&&r.x1>=other.x0&&r.y0<=other.y1&&r.y1>=other.y0))visited.add(i);});
  expect(visited.size).toBe(rects.length);
  const length=cycling.reduce((sum,s)=>sum+s.points.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-s.points[i]!.x,p.y-s.points[i]!.y),0),0);
  expect(length/10).toBeGreaterThan(8000);
  for(const id of ['town_avenue_1','suburb_avenue_1','sports_approach','western_shore','waterfront_market'])expect(cycling.some(s=>s.id===id),id).toBe(true);
 });
 it.each(['waterfront','canal-bridge','lake-bridge'])('drives the %s streets without losing the dry riding surface',scenario=>{
  let car=drivingReviewStart(createCarAtSpawn(world),context,scenario),start={x:car.x,y:car.y};
  expect(onStreet(world,car.x,car.y)).toBe(true);
  for(let i=0;i<600;i++){car=stepCar(car,{throttle:1,steer:0},1/120,context);expect(car.surface).not.toBe('water');}
  expect(Math.hypot(car.x-start.x,car.y-start.y)).toBeGreaterThan(700);
 });
 it('keeps a continuous waterway between the lake, bay and city canal',()=>{
  const water=world.terrain.landscape!.waters.find(w=>w.id==='south_lake')!;
  for(const [x,y] of [[4700,5500],[4450,6700],[4800,8200],[6500,9000],[9000,9000],[8750,6500],[8750,3500],[8750,450]] as const)expect(navigableWater(world.terrain,x,y,12,8)?.id).toBe(water.id);
  const waves=new WaterWaves(water,world.terrain);expect(waves.heights.length).toBeLessThanOrEqual(131072);
  expect(watercourseSchema.safeParse({id:'wide',stations:[{x:1000,y:1000,width:1201},{x:2000,y:1000,width:1201}],level:0,depth:12,bankWidth:30,color:'#447799',flow:{x:0,y:0}}).success).toBe(false);
  expect(waterSchema.safeParse({...water,polygon:[{x:100,y:100},{x:16000,y:100},{x:16000,y:16000},{x:100,y:16000}]}).success).toBe(false);
  // Thin diagonal water fits the area budget but exceeds the independent wave grid cap.
  expect(waterSchema.safeParse({...water,polygon:[{x:100,y:100},{x:16000,y:15900},{x:16000,y:16000},{x:100,y:200}]}).success).toBe(false);
 });
 it('sails beneath a city bridge while cars use its elevated deck',()=>{
  let boat:CarState={...createCarAtSpawn(world),control:{kind:'vehicle' as const,id:'canal_launch'},x:8750,y:2100,elevation:-2,headingRad:Math.PI/2};let under=false;
  for(let i=0;i<720;i++){boat=stepInteractive(boat,{throttle:1,steer:0},1/120,context);if(boat.y>2330&&boat.y<2370){under=true;expect(boat.elevation).toBe(-2);expect(drivingHeight(world.terrain,boat.x,boat.y)).toBeGreaterThan(20);expect(toggleRide(boat,context)).toEqual(boat);}}
  expect(under,JSON.stringify({x:boat.x,y:boat.y,elevation:boat.elevation,vx:boat.vx,vy:boat.vy})).toBe(true);expect(boat.y).toBeGreaterThan(2500);expect(boat.surface).toBe('water');
  const low={...world.terrain,landscape:{...world.terrain.landscape!,bridges:world.terrain.landscape!.bridges.map(b=>b.id==='canal_market_bridge'?{...b,archHeight:0}:b)}};
  expect(navigableWater(low,8750,2350,20,15)).toBeUndefined();
 });
 it('tiles the exact water surface with original UV/depth attributes and wave displacement bounds',()=>{
  const small=doc({terrain:{hills:[],landscape:{dslVersion:1,waters:[water],bridges:[]}}}),landscape=new WorldLandscape(small),root=landscape.group.getObjectByName('water-canal')!;let area=0,vertices=0;
  root.traverse(node=>{if(!(node instanceof Mesh))return;const p=node.geometry.getAttribute('position'),uv=node.geometry.getAttribute('uv'),depth=node.geometry.getAttribute('waterDepth');for(let i=0;i<p.count;i++){
   const x=p.getX(i)+480,y=p.getZ(i)+360;expect(p.getY(i)).toBeCloseTo(.25);expect(uv.getX(i)).toBeCloseTo((x-300)/360,5);expect(uv.getY(i)).toBeCloseTo((y-340)/120,5);expect(depth.getX(i)).toBeCloseTo(-terrainHeight(small.terrain,x,y),4);vertices++;
  }for(let i=0;i<p.count;i+=3)area+=Math.abs((p.getX(i+1)-p.getX(i))*(p.getZ(i+2)-p.getZ(i))-(p.getZ(i+1)-p.getZ(i))*(p.getX(i+2)-p.getX(i)))/2;const sphere=node.geometry.boundingSphere!;expect(sphere.radius).toBeGreaterThan(3);});
  expect(vertices).toBeGreaterThan(0);expect(area).toBeCloseTo(360*120,2);
 });
});
