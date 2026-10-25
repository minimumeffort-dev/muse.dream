import {it,expect,afterEach} from 'vitest';
import source from '../docs/examples/service-desk.dream?raw';
import {compileDreamScene,checkDream} from '../src/scene/dream';
import {workstation} from '../src/scene/workstations';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState,commerceReason} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {stepAmbient} from '../src/sim/ambient';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
const scene=compileDreamScene(source,{sceneId:'service-desk',revisionId:'r1',sourceHash:'service-desk'}),station=workstation(scene,'preparation')!;
const snapshot=JSON.stringify(scene);afterEach(()=>expect(JSON.stringify(scene)).toBe(snapshot));
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11,saveCompatibility:'c'.repeat(64)};
const start=():CarState=>{const s=createCarAtSpawn(scene);return {...s,x:station.x,y:station.y,elevation:station.elevation,control:{kind:'foot'},vehicles:[{id:null,x:s.x,y:s.y,elevation:s.elevation,headingRad:s.headingRad,distance:s.distance}]};};
const step=(s:CarState,work=false)=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,scene),population:stepAmbient(s,.25,scene)},{commerce:work ? {kind:'work',job:'stocktake'} : undefined},.25,scene);

it('accepts an entire goods-free service economy without fabricating inventory or shelves',()=>{
 const s=start();expect(scene.economy!.goods).toEqual([]);expect(scene.economy!.markets[0]!.lots).toEqual([]);expect(s.economy!.consumed).toEqual({});expect(s.economy!.markets[0]!.stock).toEqual({});expect(s.economy!.accounts.every(a=>Object.keys(a.inventory).length===0)).toBe(true);checkEconomyState(s,scene);
 expect(commerceReason(s,scene,'pocket',{kind:'buy',market:'corner',good:'bread'})).toBe('stock');
});

it.each([
 ['work stocktake(', 'work missing('],
 ['kind=service,','kind=recipe,input=flour,take=1,output=bread,make=1,'],
 ['capacity=1','capacity=2'],
 ['station=preparation','station=missing'],
])('rejects unusable service businesses and nonexistent goods: %s',(from,to)=>{
 const result=checkDream(source.replace(from,to));expect(result.ok).toBe(false);
});

it('pays from the same finite treasury and persists pending service work with empty inventories',()=>{
 let s=step(start(),true);expect(s.economy!.markets[0]!.credits).toBe(97);s=decodeSave(encodeSave(s,s.timeS,world),world).state;
 for(let i=0;i<7;i++)s=step(s);expect(s.economy!.accounts[0]!.credits).toBe(23);expect(s.economy!.batches.stocktake).toBe(1);expect(s.economy!.markets[0]!.stock).toEqual({});checkEconomyState(s,scene);
 expect(decodeSave(encodeSave(s,s.timeS,world),world).state).toEqual(s);
});

it('lets the resident walk to the same goods-free desk, finish the quota and return without extra income',()=>{
 let s={...start(),x:900,y:900};for(let i=0;i<800;i++){s=step(s);if(s.economy!.batches.stocktake===3&&!s.economy!.accounts.find(a=>a.id==='regular')!.commute)break;}
 const a=s.economy!.accounts.find(a=>a.id==='regular')!;expect(a.credits).toBe(29);expect(a.completed.work.stocktake).toBe(3);expect(a.commute).toBeUndefined();expect(s.economy!.markets[0]!.credits).toBe(91);expect(s.economy!.markets[0]!.stock).toEqual({});checkEconomyState(s,scene);
});
