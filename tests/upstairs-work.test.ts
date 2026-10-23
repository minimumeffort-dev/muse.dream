import {it,expect} from 'vitest';
import source from '../docs/examples/upstairs-work.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {workstation} from '../src/scene/workstations';
import {walkingHeight} from '../src/scene/interiors';
import {sceneFloors} from '../src/scene/floors';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepCommerce,commerceReason,nearbyWorkstation,nearbyMarket,checkEconomyState} from '../src/sim/commerce';
import {actorPose} from '../src/sim/actors';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
const identity={sceneId:'upstairs-work',revisionId:'test',sourceHash:'upstairs-work'},scene=compileDreamScene(source,identity),p=workstation(scene,'preparation')!,world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11};
const account=(s:CarState,id='regular')=>s.economy!.accounts.find(a=>a.id===id)!;
const start=():CarState=>{const s=createCarAtSpawn(scene);return {...s,control:{kind:'foot' as const},vehicles:[{id:null,x:s.x,y:s.y,elevation:s.elevation,headingRad:s.headingRad,distance:0}],x:900,y:730,elevation:0};};
const tick=(s:CarState,job?:string)=>{const next=stepCommerce({...s,timeS:s.timeS+.25},{commerce:job ? {kind:'work',job} : undefined},.25,scene);checkEconomyState(next,scene);return next;};
function until(s:CarState,p:(s:CarState)=>boolean){for(let i=0;i<2400 && !p(s);i++)s=tick(s);expect(p(s)).toBe(true);return s;}
const atStation=()=>({...start(),x:p.x,y:p.y,elevation:p.elevation,grounded:true});
it('compiles a supported floor-bound station and rejects missing floors, unsupported stands and disconnected stairs',()=>{
 expect(p.elevation).toBe(sceneFloors(scene).find(f=>f.id==='upper_room')!.elevation);expect(p.hands.y-p.elevation).toBeCloseTo(10);expect(p.elevation-walkingHeight(scene,p.x,p.y)).toBeGreaterThan(30);expect(compileDreamScene(formatDream(source),identity)).toEqual(scene);
 for(const text of [source.replace(',upper_room,upper_landing',''),source.replace('stairs flight(material=home_wood,at=[6,.5,0],size=[4,8.5,22],steps=12);',''),source.replace('at=[16.5,0],hands','at=[24,0],hands')])expect(checkDream(text).ok).toBe(false);

 const shared=source.replace('economy(){','place other_vendor(object=pedestrian,at=[730,720],role=npc,behavior=welcome);\neconomy(){').replace(' good bread(', ' market other(label="Other counter",actor=other_vendor,credits=50,radius=70){lot other_bread(good=bread,quantity=0,limit=16,price=5);lot other_flour(good=flour,quantity=0,limit=12);}\n work other_job(label="Other bread",market=other,input=flour,take=1,output=bread,make=2,seconds=2,pay=3,effort=12,capacity=1,target=4,equipment=[prep_table],station=preparation);\n good bread(');
 const invalid=checkDream(shared);expect(invalid.ok).toBe(false);if(!invalid.ok)expect(invalid.diagnostics[0]!.message).toContain('one source business');
});
it('requires the actual floor and preserves counter sight for trade while allowing work at the supported upstairs station',()=>{
 const s=atStation(),below={...s,elevation:walkingHeight(scene,p.x,p.y)};expect(commerceReason(below,scene,'pocket',{kind:'work',job:'bake'})).toBe('station');expect(commerceReason(s,scene,'pocket',{kind:'buy',market:'corner',good:'bread'})).toBe('range');expect(commerceReason(s,scene,'pocket',{kind:'work',job:'bake'})).toBeUndefined();
 expect(nearbyWorkstation(s,scene)?.id).toBe('preparation');expect(nearbyMarket(s,scene)).toBeUndefined();expect(nearbyWorkstation(below,scene)).toBeUndefined();expect(nearbyWorkstation({...s,grounded:false},scene)).toBeUndefined();
 const next=tick(s,'bake');expect(account(next,'pocket').work?.id).toBe('bake');expect([next.x,next.y,next.elevation]).toEqual([s.x,s.y,s.elevation]);expect(next.economy!.markets[0]!.stock.flour).toBe(11);expect(next.economy!.markets[0]!.credits).toBe(97);
});
it('walks the resident up and down the actual stairs, reserves only on arrival and pays exactly once',()=>{
 const snapshot=JSON.stringify(scene);let s=start(),climbed=false,worked=false;
 for(let i=0;i<2400;i++){
  s=tick(s);const a=account(s),t=a.commute;
  if(t?.phase==='out'){expect(a.work).toBeUndefined();expect(a.credits).toBe(20);if((t.elevation??0)>8 && (t.elevation??0)<p.elevation-4)climbed=true;}
  if(a.work){worked=true;const o=scene.objects.find(o=>o.id==='customer')!,pose=actorPose(scene,o,s.timeS,s);expect(Math.hypot(pose.x-p.x,pose.y-p.y,pose.elevation-p.elevation)).toBeLessThan(.1);}
  if(a.completed.work.bake===1 && !t)break;
 }
 expect(climbed && worked).toBe(true);expect(account(s).completed.work.bake).toBe(1);expect(account(s).credits).toBe(23);expect(account(s,'pocket').credits).toBe(20);expect(s.economy!.markets[0]!.stock.bread).toBe(4);expect(JSON.stringify(scene)).toBe(snapshot);
});
it('retains heights and escrow across saved climbs, upstairs work, pause-style inactivity, R and deterministic replay',()=>{
 let s=until(start(),s=>!!account(s).commute && (account(s).commute!.elevation??0)>8 && account(s).commute!.phase==='out');const climb=encodeSave(s,s.timeS,world);expect(decodeSave(climb,world).state).toEqual(JSON.parse(climb).state);
 s=until(s,s=>!!account(s).work);const text=encodeSave(s,s.timeS,world);let copy=decodeSave(text,world).state;expect(account(resetCar(s,scene)).work).toEqual(account(s).work);for(let i=0;i<16;i++){s=tick(s);copy=tick(copy);}expect(copy).toEqual(s);expect(account(s).credits).toBe(23);
});
it('refunds upstairs equipment damage once while retaining the floor and rejecting forged floor heights or through-slab saved paths',()=>{
 let s=tick(atStation(),'bake');const text=encodeSave(s,s.timeS,world);for(const mutate of [(p:any)=>p.state.elevation=walkingHeight(scene,p.state.x,p.state.y),(p:any)=>p.state.elevation+=10]){const packet=JSON.parse(text);mutate(packet);expect(()=>decodeSave(JSON.stringify(packet),world)).toThrow();}
 s=tick({...s,broken:['prep_table']});expect(account(s,'pocket').work).toBeUndefined();expect(account(s,'pocket').credits).toBe(20);expect(s.economy!.markets[0]!.stock.flour).toBe(12);expect(s.elevation).toBe(p.elevation);s=tick(s);expect(s.economy!.events.filter(e=>e.kind==='cancel')).toHaveLength(1);
 let climbing=until(start(),s=>!!account(s).commute && (account(s).commute!.elevation??0)>8);const bad=JSON.parse(encodeSave(climbing,climbing.timeS,world));bad.state.economy.accounts.find((a:any)=>a.id==='regular').commute.at.elevation+=10;expect(()=>decodeSave(JSON.stringify(bad),world)).toThrow();
});
