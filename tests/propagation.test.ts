import {expect,it} from 'vitest';
import source from '../docs/examples/sapling-propagation.dream?raw';
import {compileDreamScene,formatDream} from '../src/scene/dream';
import {parseScene,type Scene} from '../src/scene/schema';
import {createCarAtSpawn,resetCar,type CarState} from '../src/sim/car';
import {toggleRide} from '../src/sim/interaction';
import {stepCommerce,commerceReason,checkEconomyState,type CommerceAction} from '../src/sim/commerce';
import {encodeSave,decodeSave} from '../src/sim/save';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {dreamAgentContext} from '../src/scene/dream-agent';
const compile=(text=source)=>compileDreamScene(text,{sceneId:'propagation',revisionId:'test',sourceHash:'propagation'}),example=compile();
const manual=(scene=example)=>parseScene({...scene,economy:{...scene.economy!,accounts:scene.economy!.accounts.map(a=>{const {work,...old}=a;return old;})}});
const world=(scene:Scene)=>({scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11});
const start=(scene:Scene):CarState=>({...toggleRide(createCarAtSpawn(scene),world(scene)),x:580,y:750,elevation:0});
const step=(s:CarState,scene:Scene,action?:CommerceAction)=>stepCommerce({...s,timeS:s.timeS+.25},{commerce:action},.25,scene);
const action={kind:'work' as const,job:'propagate_saplings'},stock=(s:CarState)=>s.economy!.markets[0]!.stock.sapling!,a=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;

it('accepts bounded positive same-good propagation in scalar and multi-input forms, rejecting no-gain loops',()=>{
 const context=dreamAgentContext(['commerce']);expect(context.instructions).toContain('An input may equal output only when make > take');expect(JSON.stringify(context.contract)).toContain('Same-good work requires make greater');
 expect(formatDream(formatDream(source))).toBe(formatDream(source));
 const multi=source.replace('input=sapling,take=1,output=sapling','output=sapling').replace('capacity=2,target=5);','capacity=2,target=5){ingredient(good=sapling,take=1);ingredient(good=flour,take=1);}');expect(compile(multi).economy!.jobs[0]!.ingredients).toHaveLength(2);
 const mixed=manual(compile(multi));let held=step(start(mixed),mixed,action);expect(stock(held)).toBe(3);expect(held.economy!.markets[0]!.stock.flour).toBe(11);held=step(held,mixed,{kind:'cancel'});expect(stock(held)).toBe(4);expect(held.economy!.markets[0]!.stock.flour).toBe(12);checkEconomyState(held,mixed);
 const missing=manual(compile(multi.replace('quantity=12,limit=12','quantity=0,limit=12'))),blocked=step(start(missing),missing,action);expect(a(blocked).work).toBeUndefined();expect(stock(blocked)).toBe(4);checkEconomyState(blocked,missing);
 for(const make of [0,1])expect(()=>compile(source.replace('output=sapling,make=2','output=sapling,make='+make))).toThrow();
 expect(()=>compile(source.replace('take=1,output=sapling,make=2','take=2,output=sapling,make=1'))).toThrow('more than');
});
it('holds the actual input and future output once, allows the last free slot, pays once and conserves the declared gain',()=>{
 const scene=manual(compile(source.replace('quantity=4,limit=6','quantity=5,limit=6')));let s=step(start(scene),scene,action);expect(a(s).work).toBeDefined();expect(stock(s)).toBe(4);checkEconomyState(s,scene);
 const saved=encodeSave(s,s.timeS,world(scene));s=decodeSave(saved,world(scene)).state;for(let i=0;i<12;i++)s=step(s,scene);
 expect(stock(s)).toBe(6);expect(a(s).credits).toBe(22);expect(s.economy!.batches.propagate_saplings).toBe(1);expect(a(s).work).toBeUndefined();checkEconomyState(s,scene);
 expect(commerceReason(s,scene,'pocket',action)).toBe('capacity');
});
it('refunds the held seed and wage once on cancel, movement, boarding and R without producing output',()=>{
 const scene=manual();for(const mode of ['cancel','move','board','reset']){
  let s=step(start(scene),scene,action);if(mode==='move')s={...s,x:2000};if(mode==='board')s={...s,control:{kind:'car'}};if(mode==='reset')s=resetCar(s,scene);
  s=step(s,scene,mode==='cancel' ? {kind:'cancel'} : undefined);s=step(s,scene,{kind:'cancel'});expect(stock(s)).toBe(4);expect(a(s).credits).toBe(20);expect(s.economy!.batches.propagate_saplings).toBe(0);checkEconomyState(s,scene);
 }
});
it('uses the same finite seed, treasury and shelf limits for NPC production and stops at its target',()=>{
 let s=start(example);for(let i=0;i<40;i++)s=step(s,example);expect(stock(s)).toBe(5);expect(a(s,'baker').credits).toBe(2);expect(s.economy!.batches.propagate_saplings).toBe(1);checkEconomyState(s,example);
 for(const [from,to] of [['quantity=4,limit=6','quantity=0,limit=6'],['credits=100,radius=70','credits=0,radius=70'],['quantity=4,limit=6','quantity=6,limit=6']] as const){const scene=compile(source.replace(from,to).replace('credits=20,capacity=4,satiety=25','credits=0,capacity=4,satiety=65'));let s=start(scene);for(let i=0;i<20;i++)s=step(s,scene);expect(s.economy!.batches.propagate_saplings).toBe(0);expect(a(s,'baker').work).toBeUndefined();checkEconomyState(s,scene);}
});
it('fits concurrent player and NPC outputs without double-counting their mutually exclusive refunds',()=>{
 const scene=compile(source.replace('quantity=4,limit=6','quantity=3,limit=6').replace('capacity=2,target=5','capacity=3,target=6').replace('satiety=25,drain_s=.05,shop=true','satiety=65,drain_s=.05,shop=true,work=propagate_saplings'));
 let s=step(start(scene),scene,action);expect(s.economy!.accounts.filter(a=>a.work)).toHaveLength(3);expect(stock(s)).toBe(0);checkEconomyState(s,scene);
 for(let i=0;i<16;i++)s=step(s,scene);expect(stock(s)).toBe(6);expect(s.economy!.batches.propagate_saplings).toBe(3);checkEconomyState(s,scene);
});
it('keeps the output/refund envelope reserved against sellers and rejects forged seeds after reload',()=>{
 const scene=compile(source.replace('quantity=4,limit=6','quantity=6,limit=6'));let s=start(scene);for(let i=0;i<2;i++)s=step(s,scene,{kind:'buy',market:'corner',good:'sapling'});for(let i=0;i<4;i++)s=step(s,scene);
 expect(a(s,'baker').work).toBeDefined();expect(stock(s)).toBe(3);s=step(s,scene,{kind:'sell',market:'corner',good:'sapling'});expect(stock(s)).toBe(4);expect(a(s).inventory.sapling).toBe(1);expect(commerceReason(s,scene,'pocket',{kind:'sell',market:'corner',good:'sapling'})).toBe('capacity');
 const text=encodeSave(s,s.timeS,world(scene)),forged=JSON.parse(text);forged.state.economy.markets[0].stock.sapling++;expect(()=>decodeSave(JSON.stringify(forged),world(scene))).toThrow('invalid world state');
});
