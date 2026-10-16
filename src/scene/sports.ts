import {z} from 'zod';
import type {Scene} from './schema';
import {impactOf,hasAnimatedJoints} from './object-dsl';
import {roleOf} from './agents';
import {objectPlacement} from './placement';
import {objectRadius,objectHeight} from '../sim/archetypes';
import {distanceToPolygon} from './polygons';
import {drivingHeight,waterAt} from './terrain';
import {assemblyBounds} from './measure';
import {pointInPolygon} from '../sim/mask';
import {polygonsOverlap} from './landscape-dsl';

export const MAX_SPORTS=8;
const id=z.string().regex(/^[a-z][a-z0-9_]{0,39}$/);
export const sportSchema=z.object({
  id,kind:z.enum(['football','basketball']),surfaceId:id,ballId:id,
  targets:z.array(id).length(2).refine(ids=>ids[0]!==ids[1],'sport needs two different targets'),
  targetAt:z.tuple([z.number().finite().min(-128).max(128),z.number().finite().min(0).max(128),z.number().finite().min(-128).max(128)]),
  targetSize:z.tuple([z.number().finite().min(1).max(128),z.number().finite().min(1).max(128)]),
}).strict();
export type Sport=z.infer<typeof sportSchema>;

/** Target anchors follow the actual placed assembly, including scale and foundation. */
export function sportTargets(scene:Scene,sport:Sport){
  return sport.targets.map(id=>{
    const object=scene.objects.find(o=>o.id===id)!,angle=object.headingRad??0,c=Math.cos(angle),s=Math.sin(angle),[x,h,y]=sport.targetAt;
    return {id,x:object.x+(x*c-y*s)*object.scale,y:object.y+(x*s+y*c)*object.scale,
      elevation:objectPlacement(scene,object).base+h*object.scale,
      width:sport.targetSize[0]*object.scale,height:sport.targetSize[1]*object.scale,
      tx:c,ty:s,nx:-s,ny:c};
  });
}

export function sportProblems(scene:Scene):string[]{
  const problems:string[]=[],ids=new Set<string>(),balls=new Set<string>(),grounds=new Set<string>();
  const areas:Scene['surfaces']=[];
  for(const sport of scene.sports){
    const fail=(message:string)=>problems.push(`${sport.id}: ${message}`);
    if(ids.has(sport.id))fail('duplicate sport ID');ids.add(sport.id);
    if(balls.has(sport.ballId))fail('each sport needs its own ball');balls.add(sport.ballId);
    if(grounds.has(sport.surfaceId))fail('each sport needs its own surface');grounds.add(sport.surfaceId);
    const ground=scene.surfaces.find(s=>s.id===sport.surfaceId),ball=scene.objects.find(o=>o.id===sport.ballId);
    if(!ground){fail('surface does not exist');continue;}
    if(areas.some(a=>polygonsOverlap(a.points,ground.points)))fail('sports surfaces must not overlap');areas.push(ground);
    if(!ball){fail('ball placement does not exist');continue;}
    if(roleOf(ball)!=='prop' || ball.route || impactOf(ball.spec)?.kind!=='bounce' || hasAnimatedJoints(ball.spec))fail('ball must be a static prop with bounce impact');
    const radius=objectRadius(ball);
    if(radius<.5 || radius>3 || Math.abs(objectHeight(ball)-radius*2)>.2)fail('ball needs a round body with radius .5..3 world units and height twice its radius');
    if(!pointInPolygon(ball.x,ball.y,ground.points))fail('ball must start inside its surface');
    const center={x:ground.points.reduce((n,p)=>n+p.x,0)/ground.points.length,y:ground.points.reduce((n,p)=>n+p.y,0)/ground.points.length};
    const heights=[center,...ground.points].map(p=>drivingHeight(scene.terrain,p.x,p.y));
    if(Math.max(...heights)-Math.min(...heights)>3 || [center,...ground.points].some(p=>waterAt(scene.terrain,p.x,p.y,drivingHeight(scene.terrain,p.x,p.y))))fail('sport surface must be dry and nearly level');
    let valid=true;
    for(const targetId of sport.targets){
      const object=scene.objects.find(o=>o.id===targetId);
      if(!object?.spec || !('dslVersion' in object.spec) || object.spec.grounding==='surface' || roleOf(object)!=='prop' || hasAnimatedJoints(object.spec) || impactOf(object.spec)){
        fail(`target '${targetId}' must be a static upright assembly`);valid=false;continue;
      }
      const bounds=assemblyBounds(object.spec),[x,y,z]=sport.targetAt;
      if(x<bounds.min.x || x>bounds.max.x || y<bounds.min.y || y>bounds.max.y || z<bounds.min.z || z>bounds.max.z)fail(`target '${targetId}' anchor must lie inside its assembly`);
    }
    if(!valid)continue;
    const targets=sportTargets(scene,sport);
    if(Math.hypot(targets[0]!.x-targets[1]!.x,targets[0]!.y-targets[1]!.y)<64)fail('targets must be at least 64 units apart');
    if(sport.kind==='football' && targets[0]!.nx*targets[1]!.nx+targets[0]!.ny*targets[1]!.ny>-.8)fail('football targets must face opposite ends');
    for(const target of targets){
      if(!pointInPolygon(target.x,target.y,ground.points) && distanceToPolygon(target.x,target.y,ground.points)>32)fail(`target '${target.id}' must meet the playing surface`);
      if(sport.kind==='football' && (target.width<6 || target.width>120 || target.height<4 || target.height>50 || Math.abs(target.elevation-target.height/2-drivingHeight(scene.terrain,target.x,target.y))>.75 || (target.x-center.x)*target.nx+(target.y-center.y)*target.ny<=0))fail('football target needs a grounded 6..120 wide, 4..50 high opening with local +Z facing out of the field');
      if(sport.kind==='basketball' && (target.width<2.5 || target.width>12 || target.height<2.5 || target.height>12 || Math.min(target.width,target.height)<=radius*2 || target.elevation-drivingHeight(scene.terrain,target.x,target.y)<16 || target.elevation-drivingHeight(scene.terrain,target.x,target.y)>50 || (center.x-target.x)*target.nx+(center.y-target.y)*target.ny<=0))fail('basketball target needs a fitting 2.5..12 ring at height 16..50 facing into the court');
    }
  }
  return problems;
}
