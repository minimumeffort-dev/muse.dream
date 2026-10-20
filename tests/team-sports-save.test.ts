import {it,expect} from 'vitest';
import legacy from './fixtures/save-v15-r66-business.json?raw';
import {createWorldScene} from './fixtures/pre-city-world';
import {MATCH_COMPATIBILITY,BUSINESS_COMPATIBILITY,preMatchScene} from '../src/scene/save-compatibility';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {stepInteractive} from '../src/sim/interaction';
import {movementReviewStart} from '../src/game/review-start';
import {encodeSave,decodeSave,SAVE_VERSION} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {teamVenue,checkTeams} from '../src/sim/team-sports';
const scene=createWorldScene(),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11,saveCompatibility:MATCH_COMPATIBILITY,previousMatchSaveCompatibility:BUSINESS_COMPATIBILITY},idle={steer:0,throttle:0};
it('registers the exact r66 migration without resetting physical, personal or company progress',()=>{
 const old=JSON.parse(legacy),restored=decodeSave(legacy,world),{sports,...before}=old.state,{sports:afterSports,...after}=restored.state;
 expect(after).toEqual(before);expect(restored.worldTime).toBe(old.worldTime);expect(restored.migrated).toBe(true);expect(afterSports.map(({match,...g})=>g)).toEqual(sports);expect(afterSports.every(g=>g.match?.status==='ready' && g.match.members.length===11)).toBe(true);
 const packet=JSON.parse(encodeSave(restored.state,restored.worldTime,world));expect(packet.version).toBe(18);expect(SAVE_VERSION).toBe(18);expect(decodeSave(JSON.stringify(packet),world).state).toEqual(packet.state);
 expect(()=>decodeSave(legacy,{...world,previousMatchSaveCompatibility:'unregistered'})).toThrow(/different world/);
});
it('preserves the old slot and creates a new slot only after a successful write',()=>{
 const key=`muse-dream.save.v15.${scene.sceneId}.${BUSINESS_COMPATIBILITY}`,rows=new Map([[key,legacy]]),store={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}},slot=gameSave(world,()=>store);
 expect(slot.restored?.migrated).toBe(true);expect(rows.size).toBe(1);expect(slot.write(slot.restored!.state,slot.restored!.worldTime)).toBe(true);expect(rows.get(key)).toBe(legacy);expect(JSON.parse(rows.get(slot.key)!).version).toBe(18);
});
it('saves one physical shared squad and retains both venue results when changing grounds',()=>{
 let state=movementReviewStart(createCarAtSpawn(scene),world,'football');state=stepInteractive(state,{...idle,matchPressed:true},1/120,world);
 for(let i=0;i<60;i++)state=stepInteractive(state,idle,1/120,world);const previous=state.sports[0]!.match!.elapsedS;state.sports[0]!.match!.home=1;
 state=movementReviewStart(state,world,'basketball');state=stepInteractive(state,{...idle,matchPressed:true},1/120,world);
 expect(state.sports[0]!.match!.status).toBe('resting');expect(state.sports[0]!.match!.elapsedS).toBe(previous);expect(state.sports[0]!.match!.home).toBe(1);expect(teamVenue(scene,state,'football_practice')).toBe('basketball_practice');checkTeams(state,scene);
 const restored=decodeSave(encodeSave(state,8,world),world).state;expect(restored.sports).toEqual(state.sports);expect(stepInteractive(restored,idle,1/120,world)).toEqual(stepInteractive(state,idle,1/120,world));
 expect(preMatchScene(scene).sports.every(s=>!s.match && s.netDepth===undefined)).toBe(true);
});
