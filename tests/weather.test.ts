import {it,expect} from 'vitest';
import {sampleWeather,weatherSchema} from '../src/scene/weather';
import {compileDreamScene,formatDream} from '../src/scene/dream';
import source from '../docs/examples/rain-work.dream?raw';
import {dreamAgentContext} from '../src/scene/dream-agent';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {parseScene,type Scene} from '../src/scene/schema';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,stepCar,type CarState} from '../src/sim/car';
import {commerceReason,stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {WorldParticles} from '../src/game/particles';
import {WorldDaylight} from '../src/game/daylight';
import * as THREE from 'three';
const config=weatherSchema.parse({cycleSeconds:180,rainStartS:30,rainEndS:90,wetGrip:.65});
const compile=(text=source)=>compileDreamScene(text,{sceneId:'rain',revisionId:'test',sourceHash:'rain'});
it('bounds and roundtrips the authored cycle and exposes its complete model packet',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));expect(compile().weather).toEqual(config);
 expect(dreamAgentContext(['commerce']).contract.commands).toHaveProperty('weather');
 for(const text of [source+'\nweather(cycle_s=180,rain_start_s=30,rain_end_s=90,wet_grip=.65);',source.replace('wet_grip=.65','wet_grip=.1'),source.replace('rain_end_s=90','rain_end_s=170'),source.replace('rain_start_s=30','rain_start_s=89'),source.replace(/weather\([^;]+;/,'')])expect(()=>compile(text)).toThrow();
});
it('fades rain and wetness continuously across the cycle, with exact dry defaults',()=>{
 expect(sampleWeather(undefined,60)).toEqual({rain:0,wetness:0,grip:1,raining:false});
 expect(sampleWeather(config,60)).toEqual({rain:1,wetness:1,grip:.65,raining:true});
 expect(sampleWeather(config,95)).toMatchObject({rain:0,raining:false});expect(sampleWeather(config,95).wetness).toBeGreaterThan(0);
 expect(sampleWeather(config,120).grip).toBe(1);expect(sampleWeather(config,180)).toEqual(sampleWeather(config,0));
 for(const t of [30,35,40,85,90,120,180])expect(Math.abs(sampleWeather(config,t-1e-5).wetness-sampleWeather(config,t+1e-5).wetness)).toBeLessThan(.0001);
});
const fixture=parseScene({...createFixtureScene(),objects:[],regions:[],terrain:{hills:[]},weather:config});
const world=(scene:Scene)=>({scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11});
const start=(scene:Scene,timeS:number,vx=0,vy=0):CarState=>({...createCarAtSpawn(scene),x:150,y:360,timeS,vx,vy,headingRad:0});
it('reduces wet acceleration, braking and lateral grip, restores dry grip and still stops after release',()=>{
 const w=world(fixture),input={throttle:1,steer:0};
 expect(stepCar(start(fixture,60),input,.05,w).vx).toBeLessThan(stepCar(start(fixture,0),input,.05,w).vx);
 expect(stepCar(start(fixture,60,80),{throttle:-1,steer:0},.05,w).vx).toBeGreaterThan(stepCar(start(fixture,0,80),{throttle:-1,steer:0},.05,w).vx);
 expect(stepCar(start(fixture,60,40,25),{throttle:0,steer:0},.05,w).vy).toBeGreaterThan(stepCar(start(fixture,0,40,25),{throttle:0,steer:0},.05,w).vy);
 expect(stepCar(start(fixture,120),input,.05,w).vx).toBe(stepCar(start(fixture,0),input,.05,w).vx);
 let s=start(fixture,60,40);for(let i=0;i<600;i++)s=stepCar(s,{throttle:0,steer:0},1/120,w);expect(s.vx).toBe(0);expect(s.vy).toBe(0);
});
it('retains existing airborne and ice controls under the same rain cycle',()=>{
 const ice=parseScene({...fixture,regions:[{id:'ice',labelText:'ICE',polygon:[{x:100,y:300},{x:250,y:300},{x:250,y:420},{x:100,y:420}],rule:{effect:'ICE'}}]}),input={throttle:1,steer:.3};
 const wet=stepCar(start(ice,60,30,10),input,.05,world(ice)),dry=stepCar(start(ice,0,30,10),input,.05,world(ice));expect([wet.vx,wet.vy,wet.headingRad]).toEqual([dry.vx,dry.vy,dry.headingRad]);
 const a=stepCar({...start(fixture,60,30,10),grounded:false,elevation:80},input,.05,world(fixture)),b=stepCar({...start(fixture,0,30,10),grounded:false,elevation:80},input,.05,world(fixture));expect([a.vx,a.vy,a.vz,a.headingRad]).toEqual([b.vx,b.vy,b.vz,b.headingRad]);
});
it('makes player and NPC maintenance wait for dry weather without spending stock or blocking unrestricted work',()=>{
 const scene=compile(),tick=(s:CarState)=>stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);
 let s:CarState={...createCarAtSpawn(scene),timeS:60,broken:['yard_table'],control:{kind:'foot'},x:580,y:750,elevation:0};
 const before=s.economy!.markets.find(m=>m.id==='corner')!.stock.kit;
 expect(commerceReason(s,scene,'pocket',{kind:'repair',repair:'yard_furniture'})).toBe('weather');
 for(let i=0;i<8;i++)s=tick(s);expect(s.economy!.accounts.find(a=>a.id==='regular')!.repair).toBeUndefined();expect(s.economy!.markets.find(m=>m.id==='corner')!.stock.kit).toBe(before);
 expect(commerceReason(s,scene,'pocket',{kind:'work',job:'bake'})).toBeUndefined();
 s={...s,timeS:120};expect(commerceReason(s,scene,'pocket',{kind:'repair',repair:'yard_furniture'})).toBeUndefined();
});
it('finishes a committed repair when rain starts, retaining the claim and paying exactly once',()=>{
 const scene=compile(source.replace('seconds=2,pay=4','seconds=8,pay=4').replace('repair=yard_furniture,deliveries=[kits_run]','repair=yard_furniture').replace('shop=true,ration=field_snack','shop=false'));
 let s:CarState={...createCarAtSpawn(scene),timeS:28,broken:['yard_table']};
 const worker=()=>s.economy!.accounts.find(a=>a.id==='regular')!;
 for(let i=0;i<5;i++)s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);expect(worker().repair).toBeDefined();
 const cash=worker().credits;
 for(let i=0;i<120;i++)s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);
 expect(s.broken).not.toContain('yard_table');expect(worker().credits).toBe(cash+4);expect(worker().completed.repair.yard_furniture).toBe(1);checkEconomyState(s,scene);
});
it('keeps precipitation inside the existing particle draw and pool, and clears it for reduced motion',()=>{
 const scene=parseScene({...fixture,voxelWorld:{objectCell:1,groundCell:8,heightStep:1}}),particles=new WorldParticles(scene),s=start(scene,60);
 for(let i=0;i<90;i++)particles.update(s,1/30,true);
 expect(particles.mesh.geometry.getAttribute('offset').count).toBe(288);expect(particles.activeCount).toBeGreaterThan(0);expect(particles.activeCount).toBeLessThanOrEqual(256);
 const geometry=particles.mesh.geometry;particles.update(s,.1,false);expect(particles.activeCount).toBe(0);expect(particles.mesh.geometry).toBe(geometry);geometry.dispose();
});
it('uses small tire spray instead of road dust on wet ground',()=>{
 const particles=new WorldParticles(fixture),s={...start(fixture,60,100),surface:'road' as const};particles.update(s,.1,true);
 const kinds=particles.mesh.geometry.getAttribute('kind'),opacity=particles.mesh.geometry.getAttribute('opacity');
 expect(Array.from({length:256},(_,i)=>opacity.getX(i)>0 ? kinds.getX(i) : -1)).toContain(7);
 expect(Array.from({length:256},(_,i)=>opacity.getX(i)>0 ? kinds.getX(i) : -1)).not.toContain(0);particles.mesh.geometry.dispose();
});
it('softens sunlight without brightening night or changing shadow ownership',()=>{
 const doc=parseScene({...fixture,daylight:{cycleSeconds:600,startHour:0}}),scene=new THREE.Scene(),hemi=new THREE.HemisphereLight(),sun=new THREE.DirectionalLight(),fill=new THREE.DirectionalLight();
 const light=new WorldDaylight(doc,scene,hemi,sun,fill),shadow=sun.shadow;
 light.update(300,[],0);const direct=sun.intensity;light.update(300,[],1);expect(sun.intensity).toBeLessThan(direct);expect(sun.shadow).toBe(shadow);
 light.update(0,[],1);const color=scene.background as THREE.Color;expect(Math.max(color.r,color.g,color.b)).toBeLessThan(.1);expect(hemi.intensity).toBeGreaterThan(.8);
 light.pools.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});
});
