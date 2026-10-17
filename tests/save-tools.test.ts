import {it,expect,vi,afterEach} from 'vitest';
import {setImmediate} from 'node:timers/promises';
import source from '../docs/examples/npc-conversation.dream?raw';
import {compileDreamScene} from '../src/scene/dream';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {encodeSave} from '../src/sim/save';
import {saveTools} from '../src/game/save-tools';

const scene=compileDreamScene(source,{sceneId:'backup-ui',revisionId:'r1',sourceHash:'exact'}),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
const initial=createCarAtSpawn(scene),remembered={...initial,npcs:initial.npcs.map(n=>({...n,known:true}))},text=encodeSave(remembered,45,world);
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
function fixture(){
 const elements=new Map<string,any>();
 for(const id of ['save-tools','pause-menu','export-save','open-save','import-save','save-preview','backup-summary','backup-status','restore-save','cancel-restore','save-game']){
  const element=new EventTarget();elements.set(`#${id}`,Object.assign(element,{hidden:true,open:true,value:'',textContent:'',focus:vi.fn(),removeAttribute:vi.fn(),click:()=>element.dispatchEvent(new Event('click'))}));
 }
 vi.stubGlobal('document',{querySelector:(id:string)=>elements.get(id)});vi.stubGlobal('addEventListener',vi.fn());
 const revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:backup');
 let snapshot={state:initial,worldTime:0};const persist=vi.fn(()=>true),apply=vi.fn(next=>{snapshot=next;}),tools=saveTools(world,()=>snapshot,persist,apply);
 const fire=async(id:string,event='click')=>{elements.get(`#${id}`).dispatchEvent(new Event(event));await setImmediate();};
 const select=async(value:string)=>{elements.get('#import-save').files=[{size:value.length,text:async()=>value}];await fire('import-save','change');};
 return {elements,fire,select,persist,apply,tools,revoke,get snapshot(){return snapshot;}};
}

it('previews without writes, keeps a failed restore intact, then applies only after successful storage',async()=>{
 const f=fixture();await f.fire('save-tools','toggle');await f.select(text);
 expect(f.elements.get('#save-preview').hidden).toBe(false);expect(f.elements.get('#backup-summary').textContent).toContain('1 person met');expect(f.persist).not.toHaveBeenCalled();expect(f.snapshot.state).toBe(initial);
 f.persist.mockReturnValue(false);await f.fire('restore-save');expect(f.apply).not.toHaveBeenCalled();expect(f.snapshot.state).toBe(initial);expect(f.elements.get('#backup-status').textContent).toContain('has not changed');
 f.persist.mockReturnValue(true);await f.fire('restore-save');expect(f.snapshot.state.npcs[0]!.known).toBe(true);expect(f.snapshot.worldTime).toBe(45);expect(f.elements.get('#save-preview').hidden).toBe(true);expect(f.elements.get('#save-game').focus).toHaveBeenCalled();expect(f.revoke).toHaveBeenCalledWith('blob:backup');
});

it('rejects malformed files and cancels a valid preview without changing the current session',async()=>{
 const f=fixture();await f.select('{oops');expect(f.elements.get('#backup-status').textContent).toContain('not a supported');expect(f.persist).not.toHaveBeenCalled();
 await f.select(text);await f.fire('cancel-restore');await f.fire('restore-save');expect(f.apply).not.toHaveBeenCalled();expect(f.persist).not.toHaveBeenCalled();expect(f.elements.get('#open-save').focus).toHaveBeenCalled();
});

it('ignores a file read completed after resume and releases its backup URL',async()=>{
 const f=fixture();await f.fire('save-tools','toggle');let finish!:(text:string)=>void;
 f.elements.get('#import-save').files=[{size:text.length,text:()=>new Promise<string>(resolve=>{finish=resolve;})}];
 await f.fire('import-save','change');f.tools.close();finish(text);await setImmediate();await f.fire('restore-save');
 expect(f.elements.get('#save-preview').hidden).toBe(true);expect(f.apply).not.toHaveBeenCalled();expect(f.persist).not.toHaveBeenCalled();expect(f.revoke).toHaveBeenCalledWith('blob:backup');
});
