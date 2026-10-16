import {describe,it,expect} from 'vitest';
import {Mesh} from 'three';
import {compileDreamWorld,formatDream,checkDream,compileDreamScene} from '../src/scene/dream';
import {streetSchema,surfaceSchema,markingSchema,unionRects,streetRects,inRect,onStreet,markingPolygons} from '../src/scene/streets';
import {parseScene} from '../src/scene/schema';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {createWorldScene} from '../src/scene/world-fixture';
import {validateScenePlayability} from '../src/scene/validate';
import {buildStreets} from '../src/game/streets';
import {terrainSurfaceHeight} from '../src/scene/terrain';
import {createCarAtSpawn,stepCar,carFootprintClear} from '../src/sim/car';
import {buildPaperMask} from '../src/sim/mask';
import {drivingReviewStart,vehicleReviewStart} from '../src/game/review-start';
import {nearbyRide,toggleRide} from '../src/sim/interaction';
import {controlOf,hasAnimatedJoints,isReactive} from '../src/scene/object-dsl';
import example from '../docs/examples/planned-neighborhood.dream?raw';
import fullExample from '../docs/examples/dream-v2-world.dream?raw';
const world=createWorldScene(),fixture=parseScene({...createFixtureScene(),objects:[],regions:[]});
const data=compileDreamWorld(example);

describe('bounded Dream street and ground data',()=>{
 it('round-trips a reusable district with repeated circle points, without needing a world declaration',()=>{
  expect(data.streets).toHaveLength(2);expect(data.markings[1]!.points).toHaveLength(24);
  expect(compileDreamWorld(formatDream(example))).toEqual(data);
  expect(compileDreamWorld('dream 2; include district(module=town);',{town:example})).toEqual(data);
 });
 it('rejects unsupported curves, narrow streets, self-crossing ground and degenerate paint',()=>{
  const street=data.streets[0]!;
  for(const change of [{width:59},{width:181},{sidewalk:41},{points:[{x:100,y:100},{x:400,y:400}]},{points:[{x:100,y:100},{x:100,y:101}]}])expect(streetSchema.safeParse({...street,...change}).success).toBe(false);
  expect(surfaceSchema.safeParse({...data.surfaces[0],points:[{x:0,y:0},{x:100,y:100},{x:0,y:100},{x:100,y:0}]}).success).toBe(false);
  expect(markingSchema.safeParse({...data.markings[0],points:[{x:100,y:100},{x:100,y:100}]}).success).toBe(false);
  expect(surfaceSchema.safeParse({...data.surfaces[0],points:[{x:0,y:0},{x:2000,y:0},{x:2000,y:2000},{x:0,y:2000}]}).success).toBe(false);
  expect(checkDream(example.replace('count=24','count=33')).ok).toBe(false);
  expect(checkDream(example.replace('width=100','width=59')).ok).toBe(false);
 });
 it('enforces aggregate module counts and the expanded scene length bound',()=>{
  const streets=Array.from({length:32},(_,i)=>`street s_${i}(width=60,sidewalk=0,points=[[100,100],[100,200]]);`).join('');
  expect(checkDream('dream 2;'+streets+'include more(module=extra);',{extra:'dream 2;street more(width=60,sidewalk=0,points=[[200,100],[200,200]]);'}).ok).toBe(false);
  expect(()=>parseScene({...fixture,streets:Array.from({length:16},(_,i)=>({...data.streets[0],id:`long_${i}`,points:[{x:100,y:100},{x:100,y:8100}]}))})).toThrow('120000 street');
 });
 it('returns source diagnostics for invalid infrastructure in an included module',()=>{
  const result=checkDream('dream 2;include child(module=child);',{child:example.replace('sidewalk=20','sidewalk=-1')});
  expect(result.ok).toBe(false);if(!result.ok){expect(result.diagnostics[0]!.module).toBe('child');expect(result.diagnostics[0]!.code).toBe('E_SCHEMA');}
 });
});
describe('continuous, terrain-conforming streets',()=>{
 it('unions a crossing exactly once, with no sidewalk across the junction',()=>{
  const rects=streetRects(data.streets),roads=unionRects(rects),walks=unionRects(streetRects(data.streets,true),rects);
  expect(roads.filter(r=>inRect(r,400,700))).toHaveLength(1);expect(walks.some(r=>inRect(r,400,700))).toBe(false);
  expect(roads.reduce((n,r)=>n+(r.x1-r.x0)*(r.y1-r.y0),0)).toBe(2*1100*100-100*100);
  for(let x=360;x<450;x+=7)for(let y=660;y<750;y+=7)expect(roads.filter(r=>inRect(r,x+.1,y+.1))).toHaveLength(1);
 });
 it('keeps thin terrain-following paint connected at every closed seam',()=>{
  const p=markingPolygons(data.markings[1]!);expect(p).toHaveLength(24);
  p.forEach((polygon,i)=>{expect(polygon[1]).toEqual(p[(i+1)%p.length]![0]);expect(polygon[2]).toEqual(p[(i+1)%p.length]![3]);});
 });
 it('projects roads, sidewalks and overlapping grounds onto the same heightfield with stable layer heights',()=>{
  const scene=parseScene({...fixture,canonical:{...fixture.canonical,width:1600,height:1600},streets:data.streets,surfaces:[data.surfaces[0],{...data.surfaces[0]!,id:'overlay',color:'#778855'}],markings:data.markings,terrain:{hills:[{id:'hill',x:700,y:900,radiusX:600,radiusY:600,height:80}]}});
  const root=buildStreets(scene),lifts=new Map<string,Set<number>>();
  root.traverse(object=>{if(!(object instanceof Mesh))return;const p=object.geometry.getAttribute('position');for(let i=0;i<p.count;i++){
    const lift=p.getY(i)-terrainSurfaceHeight(scene.terrain,p.getX(i)+800,p.getZ(i)+800);
    expect(lift).toBeGreaterThan(.64);expect(lift).toBeLessThan(1.91);
    const set=lifts.get(object.parent!.name)??new Set();set.add(Math.round(lift*1000));lifts.set(object.parent!.name,set);
  }});
  expect(lifts.get('ground-court')).toEqual(new Set([650]));expect(lifts.get('ground-overlay')).toEqual(new Set([665]));
 });
 it('rejects disconnected streets, blocked carriageways and water crossings before scene acceptance',()=>{
  const inspect=(streets:unknown,extra={})=>{const scene=parseScene({...fixture,streets,...extra});return validateScenePlayability(scene,buildMaskForScene(scene),11);};
  const road={id:'access',width:60,sidewalk:10,points:[{x:480,y:130},{x:480,y:400}]};
  expect(inspect([road])).toEqual([]);
  expect(inspect([road],{surfaces:[{id:'blocked_ground',color:'#778855',points:[{x:440,y:250},{x:520,y:250},{x:520,y:350},{x:440,y:350}]}]})).toContainEqual(expect.objectContaining({message:expect.stringContaining('overlaps a street')}));
  expect(inspect([],{markings:[{id:'edge_paint',color:'#eeeeee',width:4,closed:false,points:[{x:0,y:100},{x:0,y:200}]}]})).toContainEqual(expect.objectContaining({message:expect.stringContaining('paint width')}));
  expect(inspect([{...road,points:[{x:380,y:350},{x:580,y:350}]}])).toContainEqual(expect.objectContaining({message:expect.stringContaining('no connection')}));
  expect(inspect([road],{objects:[{id:'obstacle',kind:'tree',labelText:'TREE',x:480,y:300,scale:1}]})).toContainEqual(expect.objectContaining({message:expect.stringContaining('obstructed')}));
  const scene=compileDreamScene(fullExample,{sceneId:'x',revisionId:'x',sourceHash:'x'});
  const wet=parseScene({...scene,streets:[{...road,points:[{x:350,y:300},{x:650,y:300}]}]});
  // A bounded basin crossing must be rejected rather than silently paved over.
  const basin={id:'test_water',polygon:[{x:450,y:280},{x:550,y:280},{x:550,y:380},{x:450,y:380}],level:0,depth:8,bankWidth:20,color:'#447799',flow:{x:0,y:0},dragPerS:2,waves:{speed:55,damping:1,strength:1}};
  const flooded=parseScene({...wet,terrain:{hills:[],landscape:{dslVersion:1,bridges:[],waters:[basin]}}});
  expect(validateScenePlayability(flooded,buildMaskForScene(flooded),11)).toContainEqual(expect.objectContaining({message:expect.stringContaining('crosses water')}));
 });
});
describe('expanded planned world',()=>{
 it('retains the circuit, controls and destruction inside existing scene limits',()=>{
  expect(world.canonical).toMatchObject({width:12000,height:10000});expect(world.objects).toHaveLength(796);
  expect(world.streets.length).toBeGreaterThan(20);expect(world.surfaces.length).toBeLessThanOrEqual(64);
  expect(world.objects.filter(o=>o.id.startsWith('block_'))).toHaveLength(44);expect(world.objects.filter(o=>/^home_\d/.test(o.id))).toHaveLength(36);
  expect(world.objects.filter(o=>/^(pitch|court)_player_/.test(o.id))).toHaveLength(4);
  expect(world.objects.filter(o=>hasAnimatedJoints(o.spec)).length+Number(hasAnimatedJoints(world.player))+1).toBe(24);
  expect(world.objects.filter(o=>o.route||controlOf(o.spec)).length).toBeLessThanOrEqual(24);
  expect(world.objects.filter(o=>isReactive(o.spec))).toHaveLength(21);expect(world.checkpoints).toHaveLength(8);
  expect(validateScenePlayability(world,buildMaskForScene(world),11)).toEqual([]);
 });
 it('keeps pitched roofs above house walls and windows on all four street-facing sides',()=>{
  for(const name of ['Garden bungalow','Two-storey home','Courtyard home']){
   const spec=world.objects.find(o=>o.labelText===name)!.spec!;
   if(!('dslVersion' in spec) || spec.dslVersion!==2)throw Error('expected assembly');
   const roof=spec.parts.find(p=>p.shape==='pyramid'),walls=spec.parts.filter(p=>p.shape==='box').sort((a,b)=>b.size[0]*b.size[1]*b.size[2]-a.size[0]*a.size[1]*a.size[2])[0]!;
   if(roof)expect(roof.position[1]-roof.size[1]/2).toBeCloseTo(walls.position[1]+walls.size[1]/2,6);
   const windows=spec.parts.filter(p=>p.material.colorA==='#779ba7');
   for(const axis of [0,2])for(const side of [-1,1])expect(windows.some(p=>p.position[axis]!*side>walls.size[axis]!/2)).toBe(true);
  }
 });
 it.each(['town','suburbs','sports'])('lets the original car drive the %s streets with normal grip',scenario=>{
  const context={scene:world,roadMask:buildMaskForScene(world),driveMask:buildPaperMask(world.canonical.width,world.canonical.height),carRadius:11};
  let car=drivingReviewStart(createCarAtSpawn(world),context,scenario),initial={x:car.x,y:car.y};
  expect(onStreet(world,car.x,car.y)).toBe(true);
  for(let i=0;i<180;i++)car=stepCar(car,{throttle:1,steer:0},1/120,context);
  expect(car.surface).toBe('road');expect(carFootprintClear(context,car.x,car.y,car.elevation,car.timeS,car)).toBe(true);
  expect(Math.hypot(car.x-initial.x,car.y-initial.y)).toBeGreaterThan(100);
 });
 it('lets the new lake launch board and exit from dry shore',()=>{
  const context={scene:world,roadMask:buildMaskForScene(world),driveMask:buildPaperMask(world.canonical.width,world.canonical.height),carRadius:11};
  const shore=vehicleReviewStart(createCarAtSpawn(world),context,'south_lake_launch');
  expect(shore.control.kind).toBe('foot');expect(nearbyRide(shore,context)?.id).toBe('south_lake_launch');
  expect(toggleRide(shore,context).control).toEqual({kind:'vehicle',id:'south_lake_launch'});
 });
});
