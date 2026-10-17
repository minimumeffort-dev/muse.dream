import {z} from 'zod';
import {createCarAtSpawn,carFootprintClear,resetCar,type CarState,type World} from './car';
import {bodyWorld} from './interaction';
import {cancelSportAction} from './sports';
import {controlFor,behaviorFor} from '../scene/agents';
import {controlOf,impactOf,zonesOf} from '../scene/object-dsl';
import {objectFragments} from '../scene/fragments';
import {actorPose} from './actors';
import {ambientNavigation} from '../scene/ambient-navigation';
import {AMBIENT_LIMITS} from '../scene/ambient';
import {SAVE_SIMULATION_VERSION} from '../scene/save-compatibility';

export const SAVE_VERSION=2,MAX_SAVE_CHARACTERS=1_000_000;
const n=z.number().finite().min(-1e7).max(1e7),clock=z.number().finite().min(0).max(1e9),count=z.number().int().min(0).max(1e9),id=z.string().min(1).max(128),v2=z.tuple([n,n]),v3=z.tuple([n,n,n]),q=z.tuple([n,n,n,n]).refine(v=>Math.abs(Math.hypot(...v)-1)<.01);
const prop=z.object({id,x:n,y:n,vx:n,vy:n,elevation:n.optional(),vz:n.optional()}).strict();
const npc=z.object({id,stateId:id,elapsedS:clock,routeTimeS:clock,animationTimeS:clock,headingRad:n,known:z.boolean(),replyAtS:clock.optional()}).strict();
const sport=z.object({id,score:count,shots:count,made:count,held:z.boolean(),possessed:z.boolean(),chargeStartS:clock.nullable(),lockUntilS:clock,resetAtS:clock,event:z.enum(['goal','basket','out']).nullable(),eventUntilS:clock,shotFrom:v2.optional(),shotAtS:clock,aim:v2.optional()}).strict();
const debris=z.object({objectId:id,fragmentId:id,x:n,y:n,elevation:n,vx:n,vy:n,vz:n,pattern:z.enum(['scatter','splinter','crumble']).optional(),topple:z.object({pivot:v3,offset:v3,axis:v3,rest:q,duration:n.positive(),angle:n}).strict().optional(),rotation:q,spin:v3,age:clock,lifetime:n.positive(),settled:z.boolean()}).strict();
const member=z.object({x:n,y:n,fromX:n,fromY:n,heading:n,fromHeading:n,distance:clock,fromDistance:clock,node:z.number().int().min(-1).max(8191),previous:z.number().int().min(-1).max(8191),random:z.number().int().min(0).max(4294967295),until:clock,pauseUntil:clock,mode:z.enum(['walk','roam','flee','alert']),speed:n}).strict();
const stateSchema:z.ZodType<CarState>=z.object({
 x:n,y:n,vx:n,vy:n,headingRad:n,elevation:n,vz:n,grounded:z.boolean(),landingSpeed:n,timeS:clock,lap:count,nextCheckpoint:count,surface:z.enum(['road','paper','ice','water']),
 boostReadyAtS:z.record(clock),boostedThisStep:z.boolean(),carBoost:z.object({held:z.boolean(),activeUntilS:clock,readyAtS:clock}).strict(),
 sports:z.array(sport).max(8),props:z.array(prop).max(4096),broken:z.array(id).max(24),brokenZones:z.array(z.object({objectId:id,zoneId:id}).strict()).max(128),debris:z.array(debris).max(128),impacts:z.array(z.never()).max(0),
 control:z.discriminatedUnion('kind',[z.object({kind:z.literal('car')}).strict(),z.object({kind:z.literal('foot')}).strict(),z.object({kind:z.literal('vehicle'),id}).strict(),z.object({kind:z.literal('passenger'),id}).strict()]),
 vehicles:z.array(z.object({id:id.nullable(),x:n,y:n,elevation:n,headingRad:n,distance:clock}).strict()).max(24),npcs:z.array(npc).max(32),population:z.object({tick:count,members:z.array(member).max(192)}).strict().optional(),distance:clock,pitch:n,bank:n,jump:z.object({held:z.boolean(),bufferUntilS:clock,coyoteUntilS:clock}).strict(),
}).strict();
const legacyPacket=z.object({kind:z.literal('dream-save'),version:z.literal(1),sourceHash:z.string().min(1).max(128),sceneId:id,worldTime:clock,state:stateSchema}).strict();
const packet=legacyPacket.extend({version:z.literal(SAVE_VERSION),compatibilityHash:z.string().regex(/^[a-f0-9]{64}$/).optional()}).strict();
const supported=z.discriminatedUnion('version',[legacyPacket,packet]);
const unique=(values:unknown[])=>new Set(values).size===values.length;
const expected=new WeakMap<World['scene'],ReturnType<typeof createCarAtSpawn>>();
function checkState(s:CarState,world:World){
 const scene=world.scene,objects=new Map(scene.objects.map(o=>[o.id,o]));let fresh=expected.get(scene);if(!fresh){fresh=createCarAtSpawn(scene);expected.set(scene,fresh);}
 const ambient=scene.objects.filter(o=>o.ambient);
 const sameIds=(a:{id:string}[],b:{id:string}[])=>{const ids=new Set(b.map(m=>m.id));return a.length===b.length && unique(a.map(n=>n.id)) && a.every(n=>ids.has(n.id));};
 if(!sameIds(s.props,fresh.props) || !sameIds(s.npcs,fresh.npcs) || !sameIds(s.sports,fresh.sports) || s.nextCheckpoint>=scene.checkpoints.length)throw Error('Saved members or checkpoint do not match this world');
 if(s.x<0 || s.y<0 || s.x>scene.canonical.width || s.y>scene.canonical.height)throw Error('Saved player is outside this world');
 if([...s.props,...s.vehicles].some(p=>p.x<0 || p.y<0 || p.x>scene.canonical.width || p.y>scene.canonical.height))throw Error('Saved prop or vehicle is outside this world');
 if(Object.keys(s.boostReadyAtS).some(id=>!scene.regions.some(r=>r.id===id && r.rule.effect==='BOOST')))throw Error('Unknown saved boost region');
 for(const snapshot of s.npcs){const program=behaviorFor(scene,objects.get(snapshot.id)!)!;if(snapshot.routeTimeS>s.timeS+1e-6 || snapshot.elapsedS>s.timeS+1e-6 || snapshot.animationTimeS>s.timeS+1e-6 || !program.states.some(state=>state.id===snapshot.stateId) || snapshot.replyAtS!==undefined && snapshot.replyAtS>s.timeS+1e-6)throw Error('Invalid saved NPC state');}
 const control=s.control;
 const occupied=control.kind==='vehicle' || control.kind==='passenger' ? objects.get(control.id) : undefined;
 const seat=occupied?.spec && 'rideable' in occupied.spec ? occupied.spec.rideable : undefined;
 if(control.kind==='vehicle' && !controlFor(occupied) || control.kind==='passenger' && (!seat || controlOf(occupied?.spec)))throw Error('Invalid saved vehicle owner');
 if(control.kind==='passenger'){const pose=actorPose(scene,occupied!,s.timeS,s);if(Math.hypot(s.x-pose.x,s.y-pose.y,s.elevation-pose.elevation)>1)throw Error('Saved passenger is separated from their vehicle');}
 if(!unique(s.vehicles.map(v=>v.id)) || s.vehicles.some(v=>v.id===null ? control.kind==='car' : !controlFor(objects.get(v.id)) || control.kind==='vehicle' && v.id===control.id) || control.kind!=='car' && !s.vehicles.some(v=>v.id===null))throw Error('Saved vehicle ownership is inconsistent');
 if(!unique(s.broken) || s.broken.some(id=>!['break','topple'].includes(impactOf(objects.get(id)?.spec)?.kind??'')))throw Error('Invalid saved destruction');
 if(!unique(s.brokenZones.map(z=>JSON.stringify([z.objectId,z.zoneId]))) || s.brokenZones.some(z=>!zonesOf(objects.get(z.objectId)?.spec).some(zone=>zone.id===z.zoneId)))throw Error('Invalid saved building damage');
 if(!unique(s.debris.map(d=>JSON.stringify([d.objectId,d.fragmentId]))))throw Error('Duplicate saved fragments');
 for(const piece of s.debris){const spec=objects.get(piece.objectId)?.spec;if(!spec || !('dslVersion' in spec) || spec.dslVersion!==2)throw Error('Unknown saved fragment');const fragment=objectFragments(spec).find(f=>f.id===piece.fragmentId);if(!fragment || !(fragment.zone ? s.brokenZones.some(z=>z.objectId===piece.objectId && z.zoneId===fragment.zone) : s.broken.includes(piece.objectId)))throw Error('Saved fragment has no matching damage');}
 const population=s.population,tick=Math.floor((s.timeS+1e-8)/AMBIENT_LIMITS.tickSeconds);
 if(population?.members.length!==fresh.population?.members.length)throw Error('Invalid saved population');
 // A stale clock would replay unbounded ambient ticks on the first movement input.
 if(population && (population.tick>Math.floor((s.timeS+1e-6)/AMBIENT_LIMITS.tickSeconds) || ambient.length>0 && population.tick<Math.max(0,tick-1)))throw Error('Invalid saved population clock');
 if(population?.members.some((m,i)=>{const o=ambient[i]!;return m.x<0 || m.y<0 || m.x>scene.canonical.width || m.y>scene.canonical.height || o.ambient!.motion.kind==='walk' && (m.mode!=='walk' || m.node<0 || m.node>=ambientNavigation(scene).nodes.length); }))throw Error('Invalid saved population member');
}
/** Save simulation data only. Held input and transient effects are deliberately cancelled. */
export function encodeSave(state:CarState,worldTime:number,world:World):string{
 const clean=cancelSportAction(state),safe={...clean,impacts:[],boostedThisStep:false,jump:{...clean.jump,held:false,bufferUntilS:0},carBoost:{...clean.carBoost,held:false}};
 const data=packet.parse({kind:'dream-save',version:SAVE_VERSION,sceneId:world.scene.sceneId,sourceHash:world.scene.sourceHash,compatibilityHash:world.saveCompatibility,worldTime,state:safe});
 checkState(data.state,world);const text=JSON.stringify(data);if(text.length>MAX_SAVE_CHARACTERS)throw Error('Save exceeds one million characters');return text;
}
export function decodeSave(text:string,world:World){
 if(text.length>MAX_SAVE_CHARACTERS)throw Error('Save exceeds one million characters');
 let data:z.infer<typeof supported>;
 try{data=supported.parse(JSON.parse(text));}catch{throw Error('This file is not a supported Muse Dream backup.');}
 const compatible=data.version===2 && data.compatibilityHash!==undefined && data.compatibilityHash===world.saveCompatibility;
 // Version 1's untagged rules are known only for simulation version 1.
 if(data.version===1 && Number(SAVE_SIMULATION_VERSION)!==1 || data.sceneId!==world.scene.sceneId || (data.sourceHash!==world.scene.sourceHash && !compatible) || data.version===2 && data.compatibilityHash!==world.saveCompatibility)throw Error('This backup needs a different world or simulation version.');
 try{checkState(data.state,world);}catch{throw Error('This backup contains invalid world state.');}
 // A valid saved world can outlive a safe active-body pose. Recover only the player.
 const state=data.state.control.kind==='passenger' || carFootprintClear(bodyWorld(data.state,world),data.state.x,data.state.y,data.state.elevation,data.state.timeS,data.state) ? data.state : resetCar({...data.state,grounded:false},world.scene);
 return {state,worldTime:data.worldTime,sourceHash:data.sourceHash,version:data.version,compatible:data.sourceHash!==world.scene.sourceHash};
}
