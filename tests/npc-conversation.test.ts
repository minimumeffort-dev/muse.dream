import {it,expect} from 'vitest';
import source from '../docs/examples/npc-conversation.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {stepInteractive} from '../src/sim/interaction';
import {nearbyNpc,npcSpeech,stepNpcs} from '../src/sim/npcs';
import {sceneSchema} from '../src/scene/schema';

const identity={sceneId:'conversation',revisionId:'r1',sourceHash:'fixture'};
const scene=compileDreamScene(source,identity),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
const idle={throttle:0,steer:0},dt=1/120;
const foot=():CarState=>({...createCarAtSpawn(scene),x:580,y:745,elevation:0,grounded:true,control:{kind:'foot'}});
const talk=(s:CarState,w=world)=>stepInteractive(s,{...idle,talkPressed:true},dt,w);
const advance=(s:CarState,seconds:number,w=world)=>{for(let i=0;i<Math.round(seconds*120);i++)s=stepInteractive(s,idle,dt,w);return s;};

it('compiles and formats plain dialogue through complete-world acceptance and rejects unsupported speech',()=>{
 expect(compileDreamScene(formatDream(source),identity)).toEqual(scene);
 for(const bad of [source.replace('radius=55','radius=81'),source.replace('event=interact','event=near_player'),source.replace('familiar=false','familiar=first'),source.replace('familiar=false','familiar=true'),source.replace('radius=55','seconds=1'),source.replace('radius=55',''),source.replace('Hello. Welcome to the neighborhood.',' '),source.replace('Hello. Welcome to the neighborhood.','x'.repeat(241)),source.replace('action=idle,face=player,say=','action=patrol,face=player,say=')])expect(checkDream(bad).ok).toBe(false);
 const diagnostic=checkDream(source.replace('Hello. Welcome to the neighborhood.','x'.repeat(241)));if(!diagnostic.ok)expect(diagnostic.diagnostics[0]!.path).toContain('/say');
 const invalid=structuredClone(scene);invalid.behaviors[0]!.states[1]!.say='x'.repeat(241);expect(sceneSchema.safeParse(invalid).success).toBe(false);
});
it('requires one grounded on-foot interaction, speaks the authored line and advances dialogue once',()=>{
 const start=foot(),accepted=JSON.stringify(scene);expect(nearbyNpc(start,scene)?.id).toBe('neighbor');expect(npcSpeech(advance(start,1),scene)).toBeUndefined();
 const next=talk(start);expect(next.npcs[0]!.known).toBe(true);expect(next.npcs[0]!.stateId).toBe('hello');expect(npcSpeech(next,scene)?.text).toBe('Hello. Welcome to the neighborhood.');expect(start.npcs[0]!.stateId).toBe('waiting');
 expect(advance(next,.2).npcs[0]!.stateId).toBe('hello');expect(talk(next).npcs[0]!.stateId).toBe('about');expect(JSON.stringify(scene)).toBe(accepted);
 for(const state of [{...start,grounded:false},{...start,y:900},{...start,elevation:100},{...start,control:{kind:'car'} as const}]){
  expect(nearbyNpc(state,scene)).toBeUndefined();expect(stepNpcs(state,dt,scene,true)[0]!.stateId).toBe('waiting');
 }
});
it('expires replies in simulation time, hides them on separation or boarding, and preserves/reset NPC ownership',()=>{
 const next=talk(foot());expect(npcSpeech(next,scene)).toBeDefined();expect(npcSpeech({...next,y:900},scene)).toBeUndefined();expect(npcSpeech({...next,control:{kind:'car'}},scene)).toBeUndefined();
 const returned=advance(next,6.1);expect(returned.npcs[0]!.stateId).toBe('waiting');expect(talk(returned).npcs[0]!.stateId).toBe('returning');expect(npcSpeech(advance(next,6.1),scene)).toBeUndefined();
 expect(resetCar(next,scene).npcs).toEqual(next.npcs);expect(resetCar(next,scene,true).npcs[0]!.replyAtS).toBeUndefined();
 const noTimer=compileDreamScene(source.replace('on finish(event=after,to=waiting,seconds=6);',''),identity),w={...world,scene:noTimer};
 const speaking=talk({...foot(),npcs:createCarAtSpawn(noTimer).npcs},w),later=advance(speaking,8.1,w);expect(later.npcs[0]!.stateId).toBe('hello');expect(npcSpeech(later,noTimer)).toBeUndefined();
});
it('selects one nearest speaker with stable ties and respects each interaction radius and transition order',()=>{
 const duplicate=sceneSchema.parse({...scene,objects:[{...scene.objects[0]!,id:'z_neighbor',x:570},{...scene.objects[0]!,id:'a_neighbor',x:590}]});
 const start={...foot(),npcs:createCarAtSpawn(duplicate).npcs};expect(nearbyNpc(start,duplicate)?.id).toBe('a_neighbor');
 const next=stepNpcs(start,dt,duplicate,true);expect(next.filter(n=>n.stateId==='hello').map(n=>n.id)).toEqual(['a_neighbor']);
 const extra=source.replace('on talk(event=interact,to=hello,radius=55,familiar=false);','on close(event=interact,to=hello,radius=10);on talk(event=interact,to=about,radius=55);'),ranges=compileDreamScene(extra,identity);
 expect(stepNpcs({...foot(),npcs:createCarAtSpawn(ranges).npcs},dt,ranges,true)[0]!.stateId).toBe('about');
 expect(stepNpcs({...foot(),y:705,npcs:createCarAtSpawn(ranges).npcs},dt,ranges,true)[0]!.stateId).toBe('hello');
});
it('resumes a routed NPC at the same route position after a conversation interruption',()=>{
 const routed=source.replace('state waiting(action=idle)','state waiting(action=patrol)').replace('at=[580,710],role=npc','route=stroll,role=npc')+'route stroll(kind=ambient,mode=shuttle,speed=9){point(at=[580,710]);point(at=[780,710]);}';
 const doc=compileDreamScene(routed,identity),w={...world,scene:doc};let s=advance({...foot(),npcs:createCarAtSpawn(doc).npcs},1,w),routeTime=s.npcs[0]!.routeTimeS;
 s=talk(s,w);expect(s.npcs[0]!.routeTimeS).toBe(routeTime);s=advance(s,1,w);expect(s.npcs[0]!.routeTimeS).toBe(routeTime);
 s=advance(s,5.2,w);expect(s.npcs[0]!.stateId).toBe('waiting');expect(s.npcs[0]!.routeTimeS).toBeGreaterThan(routeTime);expect(s.npcs[0]!.routeTimeS).toBeLessThan(routeTime+.3);
});

it('keeps recorded caption text bounded, handles long words and retains literal markup',async()=>{
 const {captionLines}=await import('../src/game/media-capture');
 expect(captionLines('hello there neighbor',10,s=>s.length)).toEqual(['hello','there','neighbor']);
 expect(captionLines('abcdefghijkl',5,s=>s.length)).toEqual(['abcde','fghij','kl']);
 expect(captionLines('<script> & hello',20,s=>s.length)).toEqual(['<script> & hello']);
 expect(captionLines('  hello \n neighbor ',30,s=>s.length)).toEqual(['hello neighbor']);
});
