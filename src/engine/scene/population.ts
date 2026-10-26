import {contactOverlaps,type ContactFootprint} from './contact-geometry';
import {assemblyBounds} from './measure';
import {ambientMotionSchema,type Ambient} from './ambient';
import {z} from 'zod';
import type {Scene,SceneObject,Point} from './schema';
import {objectDslSchema,isReactive,type ObjectDslV2} from './object-dsl';
import {assemblyPlacementRadius,measuredScale} from './measure';
import {isActor,controlFor} from './agents';
import {streetFootprints,streetSidewalks,onPolygon} from './streets';
import {sitePath,streetFrame,crossingPolygons} from './sites';
import {distanceToPolygon} from './polygons';
import {roadPoints,distanceToRoad} from './road';
import {pointInPolygon} from '../sim/mask';
import {terrainHeight,waterAt} from './terrain';
import {bridgePolygon} from './landscape-dsl';
import {routeInfrastructure} from './routes';
import {objectHeight} from '../sim/archetypes';
import {SpatialGrid} from '../sim/spatial';

export const POPULATION_LIMITS=Object.freeze({rules:32,perRule:128,generated:1024,candidatesPerRule:2048,flocks:16,birds:256});
const refs=z.array(z.string().regex(/^[a-z][a-z0-9_]{0,31}$/)).min(1).max(32);
export const furnishingSchema=z.object({id:z.string(),streets:refs.optional(),sites:refs.optional(),grounds:refs.optional(),omit:z.array(z.string().regex(/^[a-z][a-z0-9_]{0,63}$/)).min(1).max(32).optional(),paving:z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),spacing:z.number().finite().min(12).max(800),
  setback:z.number().finite().min(0).max(120),side:z.enum(['left','right','both']).default('both'),facing:z.enum(['along','street','varied']).default('along'),
  jitter:z.number().finite().min(0).max(.3).default(0),seed:z.number().int().min(0).max(65535),count:z.number().int().min(1).max(12).optional(),
  pose:z.literal('rest').optional(),motion:ambientMotionSchema.optional(),
  role:z.enum(['prop','controllable']).default('prop'),
  on:z.enum(['verge','sidewalk']).default('verge'),
}).strict().superRefine((r,ctx)=>{
  if(r.omit && (new Set(r.omit).size!==r.omit.length || r.omit.some(id=>!id.startsWith(r.id+'_'))))ctx.addIssue({code:'custom',message:'omit needs unique slot IDs belonging to this furnish rule',path:['omit']});
  if(Number(!!r.streets)+Number(!!r.sites)!==1 || !!r.sites!==!!r.count)ctx.addIssue({code:'custom',message:'furnish needs streets, or sites with count'});
  if(r.streets && r.spacing<80)ctx.addIssue({code:'custom',message:'street furnishing spacing must be at least 80'});
  if(r.paving && !r.sites)ctx.addIssue({code:'custom',message:'paving belongs to destination furnishing'});
  if(r.on==='sidewalk' && (r.setback!==0 || r.paving))ctx.addIssue({code:'custom',message:'sidewalk furnishing requires setback=0 and no paving'});
  if(r.role==='controllable' && (r.pose || r.motion || r.on==='sidewalk'))ctx.addIssue({code:'custom',message:'controllable furnishing creates parked vehicles without rest, ambient motion or sidewalk placement'});
  if(new Set(r.streets??r.sites??[]).size!==(r.streets??r.sites??[]).length)ctx.addIssue({code:'custom',message:'furnish targets must be unique'});
});
export type Furnishing=z.infer<typeof furnishingSchema>&{objects:ObjectDslV2[];rigs?:Ambient['joints'][]};
const resting=new WeakMap<ObjectDslV2,ObjectDslV2>();
/** Explicit resting scenery preserves the full model and body, without live rig ownership. */
export function restingTemplate(spec:ObjectDslV2):ObjectDslV2{
  if(isReactive(spec) || spec.emitter || spec.body.interaction==='knockable' || spec.joints?.some(j=>j.proximity))throw Error('rest pose cannot disable damage, emitters, knockables or proximity interactions');
  let value=resting.get(spec);
  if(!value){value={...spec,parts:spec.parts.map(({animation,...part})=>part),...(spec.joints ? {joints:spec.joints.map(({bone,animation,...joint})=>joint)} : {})};resting.set(spec,value);}
  return value;
}
export const flockSchema=z.object({id:z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),spec:objectDslSchema,
  center:z.object({x:z.number().finite(),y:z.number().finite()}).strict(),radius:z.object({x:z.number().finite().min(40).max(1200),y:z.number().finite().min(40).max(1200)}).strict(),
  count:z.number().int().min(1).max(32),altitude:z.number().finite().min(60).max(300),speed:z.number().finite().min(5).max(80),
  flapHz:z.number().finite().min(0).max(6).default(2),flapDeg:z.number().finite().min(0).max(25).default(12),seed:z.number().int().min(0).max(65535),
}).strict().superRefine((f,ctx)=>{
  if(f.spec.body.interaction!=='decor' || isReactive(f.spec) || f.spec.foundation || f.spec.dslVersion===2 && (f.spec.rideable || f.spec.emitter || f.spec.contacts || f.spec.lamp))ctx.addIssue({code:'custom',message:'flocks require passive decor without contacts, seats, foundations, damage or emitters'});
  if(assemblyPlacementRadius(f.spec,measuredScale(f.spec))>20)ctx.addIssue({code:'custom',message:'flock members must fit a 20-unit horizontal radius'});
});
export type Flock=z.infer<typeof flockSchema>;
export function seededRandom(seed:number){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}

/** Street-relative candidates are filtered against the complete linked scene, never placed on guessed coordinates. */
export function furnishWorld(scene:Scene,rules:Furnishing[]):{objects:SceneObject[];surfaces:Scene['surfaces']}{
  const occupied=new SpatialGrid<ContactFootprint>([]),existing=scene.objects.filter(o=>!isActor(o) || !o.route);
  let maxRadius=0;
  for(const o of existing){const r=o.spec && 'dslVersion' in o.spec ? assemblyPlacementRadius(o.spec,o.scale)+(controlFor(o) ? 16 : isActor(o) ? 4 : 0) : 30;if(o.spec && 'interior' in o.spec && o.spec.interior){
    const b=assemblyBounds(o.spec),a=o.headingRad??0,c=Math.cos(a),s=Math.sin(a),x=(b.min.x+b.max.x)/2*o.scale,y=(b.min.z+b.max.z)/2*o.scale,halfX=(b.max.x-b.min.x)/2*o.scale,halfY=(b.max.z-b.min.z)/2*o.scale;
    const contact={x:o.x+x*c-y*s,y:o.y+x*s+y*c,r:Math.hypot(halfX,halfY),box:{halfX,halfY,headingRad:a}};occupied.insert(contact);maxRadius=Math.max(maxRadius,contact.r);
   }else{occupied.insert({x:o.x,y:o.y,r});maxRadius=Math.max(maxRadius,r);}}
  const ground=streetFootprints(scene),reserved=ground.reserved,walkways=streetSidewalks(scene),road=roadPoints(scene),paths=scene.sites.map(s=>({points:sitePath(scene,s),r:s.width/2+4}));
  const fixedExclusions=[...(scene.terrain.landscape?.bridges??[]).map(bridgePolygon),...scene.crossings.flatMap(c=>crossingPolygons(scene,c))];
  const corridors=scene.routes.filter(r=>['rail','path','air'].includes(r.kind)).map(route=>routeInfrastructure(route));
  const generated:SceneObject[]=[],pads=new Map<string,{color:string;dx:number;dy:number;origin:Point;inner:number;outer:number;low:number;high:number;side:number}>();
  for(const rule of rules){
    for(const id of rule.grounds??[])if(!scene.surfaces.some(s=>s.id===id))throw Error(`furnish "${rule.id}" has unknown ground "${id}"`);
    const exclusions=[...fixedExclusions,...scene.surfaces.filter(s=>!rule.grounds?.includes(s.id)).map(s=>s.points)];
    const random=seededRandom(rule.seed),targets=rule.streets??rule.sites!,candidates:{street:Scene['streets'][number];distance:number;side?:number;siteId?:string;key:string}[]=[];
    for(const [targetIndex,id] of targets.entries()){
      const site=rule.sites ? scene.sites.find(s=>s.id===id) : undefined;
      const street=scene.streets.find(s=>s.id===(site?.street??id));
      if(!street || rule.sites && !site)throw Error(`furnish "${rule.id}" has unknown ${rule.sites ? 'site' : 'street'} "${id}"`);
      const lengths=[0];for(let i=1;i<street.points.length;i++)lengths.push(lengths.at(-1)!+Math.hypot(street.points[i]!.x-street.points[i-1]!.x,street.points[i]!.y-street.points[i-1]!.y));
      const length=lengths.at(-1)!;
      if(site){
        const end=site.points.at(-1)!,frame=streetFrame(street,end),side=Math.sign((end.x-frame.x)*-frame.dy+(end.y-frame.y)*frame.dx)||1;
        let distance=0,best=Infinity;for(let i=1;i<street.points.length;i++){const a=street.points[i-1]!,b=street.points[i]!,d=lengths[i]!-lengths[i-1]!,t=Math.max(0,Math.min(1,((end.x-a.x)*(b.x-a.x)+(end.y-a.y)*(b.y-a.y))/(d*d))),delta=Math.hypot(a.x+(b.x-a.x)*t-end.x,a.y+(b.y-a.y)*t-end.y);if(delta<best){best=delta;distance=lengths[i-1]!+d*t;}}
        // Keep the entrance itself open; put the parking row beside its approach.
        for(let i=0;i<rule.count!;i++)candidates.push({street,distance:distance+(i%2 ? -1 : 1)*(36+Math.floor(i/2)*rule.spacing)+(rule.jitter ? (random()-.5)*rule.spacing*rule.jitter : 0),side,siteId:id,key:`${targetIndex}_${i}`});
      }else{
        if(length/rule.spacing*2>POPULATION_LIMITS.candidatesPerRule)throw Error(`furnish "${rule.id}" exceeds candidate budget`);
        for(let d=rule.spacing*.5,i=0;d<length-rule.spacing*.25;d+=rule.spacing,i++)candidates.push({street,distance:d+(random()-.5)*rule.spacing*rule.jitter,key:`${targetIndex}_${i}`});
      }
    }
    if(candidates.length*2>POPULATION_LIMITS.candidatesPerRule)throw Error(`furnish "${rule.id}" exceeds candidate budget`);
    const slots=rule.omit ? new Set(candidates.flatMap(c=>(c.side ? [c.side] : rule.side==='both' ? [-1,1] : [rule.side==='left' ? -1 : 1]).map(side=>`${rule.id}_${c.key}_${side<0 ? 'l':'r'}`))) : undefined;
    for(const id of rule.omit??[])if(!slots!.has(id))throw Error(`furnish "${rule.id}" has unknown omitted slot "${id}"`);
    let emitted=0;
    for(const candidate of candidates){
      const {street,key}=candidate,lengths=[0];for(let i=1;i<street.points.length;i++)lengths.push(lengths.at(-1)!+Math.hypot(street.points[i]!.x-street.points[i-1]!.x,street.points[i]!.y-street.points[i-1]!.y));
      if(candidate.distance<0 || candidate.distance>lengths.at(-1)!)continue;
      let segment=1;while(lengths[segment]!<candidate.distance)segment++;
      const a=street.points[segment-1]!,b=street.points[segment]!,length=lengths[segment]!-lengths[segment-1]!,dx=(b.x-a.x)/length,dy=(b.y-a.y)/length,d=candidate.distance-lengths[segment-1]!;
      const sides=candidate.side ? [candidate.side] : rule.side==='both' ? [-1,1] : [rule.side==='left' ? -1 : 1];
      for(const side of sides){
        const choice=Math.floor(random()*rule.objects.length),spec=rule.objects[choice]!,scale=measuredScale(spec),r=assemblyPlacementRadius(spec,scale),riding=street.width/2+(street.cycleWidth ? street.cycleWidth+6 : 0);
        if(rule.omit?.includes(`${rule.id}_${key}_${side<0 ? 'l':'r'}`))continue;
        if(rule.on==='sidewalk' && (spec.body.interaction!=='decor' || street.sidewalk<2*r+9))continue;
        const offset=rule.on==='sidewalk' ? riding+street.sidewalk-r-1 : riding+street.sidewalk+rule.setback+r;
        const x=a.x+dx*d-dy*offset*side,y=a.y+dy*d+dx*offset*side;
        const overlaps=(p:Point[])=>pointInPolygon(x,y,p)||distanceToPolygon(x,y,p)<r+4;
        const occupiedRoad=(rule.on==='sidewalk' ? ground.riding : reserved).some(p=>pointInPolygon(x,y,p)||distanceToPolygon(x,y,p)<r+.01);
        if(rule.on==='sidewalk' && Array.from({length:9},(_,i)=>i ? {x:x+Math.cos(i*Math.PI/4)*r,y:y+Math.sin(i*Math.PI/4)*r} : {x,y}).some(p=>!walkways.some(w=>onPolygon(w,p.x,p.y))))continue;
        if(x<r+8 || y<r+8 || x>scene.canonical.width-r-8 || y>scene.canonical.height-r-8 || occupiedRoad || exclusions.some(overlaps) || distanceToRoad(road,x,y)<scene.roadMaskRef.params.roadWidth/2+r+8 || paths.some(p=>distanceToRoad(p.points,x,y)<p.r+r) || corridors.some(c=>distanceToRoad(c.points,x,y)<c.radius+r+8))continue;
        if(Array.from({length:9},(_,i)=>({x:x+Math.cos(i*Math.PI/4)*r,y:y+Math.sin(i*Math.PI/4)*r})).some(p=>waterAt(scene.terrain,p.x,p.y)))continue;
        if(occupied.query(x,y,r+maxRadius+4).some(o=>contactOverlaps(o,x,y,r+4)))continue;
        if(++emitted>POPULATION_LIMITS.perRule || generated.length>=POPULATION_LIMITS.generated || scene.objects.length+generated.length>=4096)throw Error(`furnish "${rule.id}": expansion exceeds 128 per rule, 1024 generated or 4096 scene objects (${emitted} in rule, ${generated.length} generated)`);
        const heading=rule.facing==='varied' ? random()*Math.PI*2 : Math.atan2(dy,dx)+(rule.facing==='street' ? -side*Math.PI/2 : 0);
        generated.push({id:`${rule.id}_${key}_${side<0 ? 'l':'r'}`,kind:'custom',labelText:spec.displayName,x,y,headingRad:heading,scale,spec,role:rule.motion ? 'ambient' : rule.role,...(rule.role==='controllable' ? {parked:true as const} : {}),...(rule.motion ? {ambient:{motion:rule.motion,joints:rule.rigs?.[choice]??[]}} : {})});
        if(rule.paving && candidate.siteId){
          const id=`parking_${candidate.siteId}_${segment}_${rule.paving.slice(1)}`,inner=offset-rule.setback-r-.5,outer=offset+r+4;
          const pad=pads.get(id)??{color:rule.paving,dx,dy,origin:a,inner,outer,low:d-r-4,high:d+r+4,side};
          pad.low=Math.min(pad.low,d-r-4);pad.high=Math.max(pad.high,d+r+4);pad.outer=Math.max(pad.outer,outer);pads.set(id,pad);
        }
        occupied.insert({x,y,r});maxRadius=Math.max(maxRadius,r);
      }
    }
  }
  const surfaces=[...pads].map(([key,p])=>({id:'parking_'+([...key].reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0),0)>>>0).toString(36),color:p.color,points:[[p.low,p.inner],[p.high,p.inner],[p.high,p.outer],[p.low,p.outer]].map(([d,n])=>({x:p.origin.x+p.dx*d!-p.dy*n!*p.side,y:p.origin.y+p.dy*d!+p.dx*n!*p.side}))}));
  if(scene.surfaces.length+surfaces.length>64)throw Error('furnish parking aprons exceed 64 scene surfaces');
  return {objects:generated,surfaces};
}

/** Flight clears the whole habitat, including roofs, while retaining a finite resident bound. */
export function flockBase(scene:Scene,flock:Flock){
  let base=0;
  for(let y=-1;y<=1;y+=.25)for(let x=-1;x<=1;x+=.25)base=Math.max(base,terrainHeight(scene.terrain,flock.center.x+x*flock.radius.x,flock.center.y+y*flock.radius.y));
  for(const o of scene.objects)if(Math.abs(o.x-flock.center.x)<flock.radius.x+100 && Math.abs(o.y-flock.center.y)<flock.radius.y+100)base=Math.max(base,terrainHeight(scene.terrain,o.x,o.y)+objectHeight(o));
  return base+flock.altitude;
}
