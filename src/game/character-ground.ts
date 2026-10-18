import type {Point,Scene} from '../scene/schema';
import type {CarState} from '../sim/car';
import type {GroundSample} from './humanoid-gait';
import {streetPlanSteps} from './streets';
import {finishBuild} from './batching';
import {polygonBounds,subtractPolygons} from '../scene/polygons';
import {onPolygon,streetPolygons} from '../scene/streets';
import {roadFootprint,roadRibbon,ROAD_SURFACE_LIFT,ROAD_CURB_WIDTH} from '../scene/road';
import {roadSections,timberFootprints,curbLiftAt} from './road-surfaces';
import {bridgeAt} from '../scene/landscape-dsl';
import {terrainHeight,drivingHeight} from '../scene/terrain';
import {surfaceHeight,voxelSurfaceBase,bridgeHeightAt} from './surface';
import {walkingHeight} from '../scene/interiors';
import {queryStaticContacts} from '../scene/contacts';
import {actorContacts} from '../sim/actors';
import {contactOverlaps} from '../scene/contact-geometry';
import {isBroken} from '../sim/impacts';
import {objectGroundLift} from './world3d';

type Patch={polygon:Point[];lift:number;curb?:boolean};
type IndexedPatch=Patch&{bounds:ReturnType<typeof polygonBounds>};
export type CharacterGroundData={sourceHash:string;width:number;height:number;patches:Patch[]};
const cache=new WeakMap<Scene,{data:CharacterGroundData;bins:Map<string,IndexedPatch[]>}>(),CELL=256;
const limits={patches:100000,points:1000000,references:4000000};
/** Reuse the render plan in the existing worker. This cache is never Dream or saved data. */
export function prepareCharacterGround(scene:Scene):CharacterGroundData{
 const found=cache.get(scene);if(found)return found.data;
 const plan=finishBuild(streetPlanSteps(scene)),patches:Patch[]=plan.layers.filter(l=>l.footing).flatMap(l=>l.polygons.map(polygon=>({polygon,lift:l.lift})));
 const holes=[...timberFootprints(scene),...streetPolygons(scene.streets)];
 patches.push(...subtractPolygons(roadFootprint(scene),holes).map(polygon=>({polygon,lift:ROAD_SURFACE_LIFT})));
 const sections=roadSections(scene),half=scene.roadMaskRef.params.roadWidth/2;
 for(const side of [-1,1]){
  const bands=sections.slice(1).map((b,i)=>roadRibbon(sections[i]!,b,side*(half-ROAD_CURB_WIDTH/2),side*(half+ROAD_CURB_WIDTH/2)));
  patches.push(...subtractPolygons(bands,[...timberFootprints(scene),...streetPolygons(scene.streets,'reserved')]).map(polygon=>({polygon,lift:3.1,curb:true})));
 }
 patches.push(...scene.regions.map(r=>({polygon:r.polygon,lift:1.65})));
 const data={sourceHash:scene.sourceHash,width:scene.canonical.width,height:scene.canonical.height,patches};primeCharacterGround(scene,data);return data;
}
export function primeCharacterGround(scene:Scene,data:CharacterGroundData):void{
 const fail=()=>{throw Error('Invalid prepared character ground');};
 if(!data || data.sourceHash!==scene.sourceHash || data.width!==scene.canonical.width || data.height!==scene.canonical.height || !Array.isArray(data.patches) || data.patches.length>limits.patches)fail();
 const bins=new Map<string,IndexedPatch[]>();let points=0,references=0;
 for(const patch of data.patches){
  if(!patch || !Number.isFinite(patch.lift) || patch.lift<0 || patch.lift>128 || patch.curb!==undefined && patch.curb!==true || !Array.isArray(patch.polygon) || patch.polygon.length<3 || (points+=patch.polygon.length)>limits.points || patch.polygon.some(p=>!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < -2048 || p.y < -2048 || p.x>data.width+2048 || p.y>data.height+2048))fail();
  const b=polygonBounds(patch.polygon),x0=Math.floor(b.x0/CELL),x1=Math.floor(b.x1/CELL),y0=Math.floor(b.y0/CELL),y1=Math.floor(b.y1/CELL);
  if((references+=(x1-x0+1)*(y1-y0+1))>limits.references)fail();
  const indexed={...patch,bounds:b};
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const key=`${x},${y}`,list=bins.get(key)??[];list.push(indexed);bins.set(key,list);}
 }
 cache.set(scene,{data,bins});
}

/** Two bounded visual probes per human; physical support, bodies and clocks remain untouched. */
export function characterGround(scene:Scene){
 if(!cache.has(scene))prepareCharacterGround(scene);
 const {bins}=cache.get(scene)!,curbLift=curbLiftAt(scene),lifts=new Map(scene.objects.map(o=>[o.id,objectGroundLift(o)]));
 const result:GroundSample={height:0,slopeX:0,slopeZ:0,surfaceOffset:0};
 return (x:number,y:number,fromHeight:number,radius:number,state?:CarState)=>{
  const bridge=bridgeAt(scene.terrain.landscape,x,y),below=!!bridge && fromHeight<drivingHeight(scene.terrain,x,y)-4;
  const terrain=(px:number,py:number)=>terrainHeight(scene.terrain,px,py);
  const sample=bridge && !below ? bridgeHeightAt(scene,bridge) : terrain;
  const top=(px:number,py:number)=>scene.voxelWorld && !(bridge && !below) ? Math.floor((below ? terrain(px,py) : voxelSurfaceBase(scene,px-scene.canonical.width/2,py-scene.canonical.height/2)+1e-5)/scene.voxelWorld.heightStep)*scene.voxelWorld.heightStep : surfaceHeight(scene,px,py,sample);
  const base=below ? terrain(x,y) : walkingHeight(scene,x,y,radius);
  let physical=base,height=top(x,y),sx=0,sz=0;
  if(!scene.voxelWorld || bridge && !below){const d=.02;sx=(top(x+d,y)-top(x-d,y))/(2*d);sz=(top(x,y+d)-top(x,y-d))/(2*d);}
  let lift=bridge && !below && bridge.style==='timber' ? ROAD_SURFACE_LIFT : 0;
  if(!below && bridge?.style!=='timber')for(const p of bins.get(`${Math.floor(x/CELL)},${Math.floor(y/CELL)}`)??[]){const b=p.bounds;if(x>=b.x0 && x<=b.x1 && y>=b.y0 && y<=b.y1 && onPolygon(p.polygon,x,y,0))lift=Math.max(lift,p.curb ? curbLift(x,y,p.lift) : p.lift);}
  if(bridge && !below && lift===0)lift=ROAD_SURFACE_LIFT;
  height+=lift;
  // A contact cap may be a low step or a parked vehicle; broken pieces cannot support a foot.
  const actors=state && fromHeight>physical+4.25 ? actorContacts(scene,state.timeS,state) : [];
  for(const c of [...queryStaticContacts(scene,x,y,radius,state),...actors])if((!state || !isBroken(state,c)) && c.top<=fromHeight-.2+4.05 && c.top>=physical-.05 && contactOverlaps(c,x,y,radius)){
   const visible=c.top+(c.id ? lifts.get(c.id)??1.5 : 0);physical=Math.max(physical,c.top);if(visible>height){height=visible;sx=sz=0;}
  }
  if(!below && base>drivingHeight(scene.terrain,x,y)+.05 && physical>height){height=physical;sx=sz=0;}
  result.height=height+.2;result.slopeX=sx;result.slopeZ=sz;result.surfaceOffset=height-physical;return result;
 };
}
