import {controlOf} from "./object-dsl";
import {controlFor,isActor,roleOf} from "./agents";
import { assemblyHorizontalRadius, playerHeight, measuredScale, CAR_PROPORTION_RULES } from "./measure";
import { roadPoints, roadFrames, bridgeFitsRoad, ROAD_CURB_WIDTH, distanceToRoad } from "./road";
import { SpatialGrid } from "../sim/spatial";
import { archetypeOf, objectRadius,objectHeight } from "../sim/archetypes";
import { pointInPolygon, RasterMask } from "../sim/mask";
import type { Scene } from "./schema";
import { bridgePolygon, bridgeCoordinates, polygonsOverlap } from "./landscape-dsl";
import { bridgeHeight, bridgeRails, terrainHeight, waterAt } from "./terrain";
import { drivingHeight } from "./terrain";
import { objectContacts } from "./contacts";
import { routePath,routePoint,routeFrames,routeInfrastructure } from "./routes";
import { actorPose,actorContacts,routeElevation } from "../sim/actors";
import {streetRects,rectPolygon,inRect,streetFootprints,markingPolygons} from './streets';

export interface SceneProblem {
  code:
    | "road-bend-too-tight"
    | "road-out-of-bounds"
    | "mask-dimensions"
    | "spawn-not-clear"
    | "checkpoint-not-on-road"
    | "checkpoint-unreachable"
    | "region-off-road"
    | "region-out-of-bounds"
    | "duplicate-id"
    | "island-filled"
    | "object-out-of-bounds"
    | "object-blocks-route"
    | "landscape-out-of-bounds"
    | "landscape-overlap"
    | "water-not-contained"
    | "bridge-not-clear"
    | "bridge-road-disconnected"
    | "route-not-clear"
    | "object-proportions";
  message: string;
}

/**
 * Semantic validation beyond schema shape: a schema-valid scene can still be
 * unplayable (spawn inside a wall, road too narrow for the footprint,
 * checkpoint sealed off by a broken boundary). Returns every problem found;
 * an empty list means the scene is playable for the given footprint.
 */
export function validateScenePlayability(
  scene: Scene,
  mask: RasterMask,
  carRadius: number,
): SceneProblem[] {
  const problems: SceneProblem[] = [];
  const reference=scene.player?.dslVersion===2 && scene.player.measure?.kind==="car" ? scene.player.measure.meters : undefined;
  if(reference)for(const object of scene.objects){
    const spec=object.spec && "dslVersion" in object.spec && object.spec.dslVersion===2 ? object.spec : undefined;
    if(!spec?.measure || !Object.hasOwn(CAR_PROPORTION_RULES,spec.measure.kind))continue;
    const relation=CAR_PROPORTION_RULES[spec.measure.kind as keyof typeof CAR_PROPORTION_RULES];
    const meters=spec.measure.meters*object.scale/measuredScale(spec);
    if(relation==="larger" ? meters<=reference : meters>=reference)
      problems.push({code:"object-proportions",message:`${object.id}: ${spec.measure.kind} must measure ${relation} than the player car's ${reference} m length; use kind=custom for deliberate fantasy sizes`});
  }

  const { width, height } = scene.canonical;

  if (mask.width !== width || mask.height !== height) {
    return [{ code: "mask-dimensions", message: "road mask dimensions do not match the scene" }];
  }

  const halfRoad=scene.roadMaskRef.params.roadWidth/2;
  const path=roadPoints(scene);
  if (path.some(p=>p.x<halfRoad || p.y<halfRoad || p.x>width-halfRoad || p.y>height-halfRoad))
    problems.push({code:"road-out-of-bounds",message:"road extends outside the travel boundary"});

  const frames=roadFrames(scene),edgeOffset=halfRoad+ROAD_CURB_WIDTH/2;
  for(let i=1;i<frames.length;i++){
    const a=frames[i-1]!,b=frames[i]!,dx=b.x-a.x,dy=b.y-a.y,length2=dx*dx+dy*dy;
    const turn=(b.nx-a.nx)*dx+(b.ny-a.ny)*dy;
    if(length2-Math.abs(edgeOffset*turn)<=length2*.05){
      problems.push({code:"road-bend-too-tight",message:"road bend would fold the inside curb; widen the turn"});break;
    }
  }

  const ids = new Set<string>();
  for (const id of [
    ...scene.checkpoints.map((c) => c.id),
    ...scene.regions.map((r) => r.id),
    ...scene.objects.map((o) => o.id),
    ...(scene.terrain.landscape?.waters ?? []).map(w=>w.id),
    ...(scene.terrain.landscape?.bridges ?? []).map(b=>b.id),
    ...scene.routes.map(r=>r.id),...scene.behaviors.map(b=>b.id),
    ...scene.streets.map(r=>r.id),...scene.surfaces.map(r=>r.id),...scene.markings.map(r=>r.id),
  ]) {
    if (ids.has(id)) {
      problems.push({ code: "duplicate-id", message: `duplicate id "${id}"` });
    }
    ids.add(id);
  }

  const {waters=[],bridges=[]}=scene.terrain.landscape ?? {};
  for(const feature of [...waters.map(w=>({id:w.id,polygon:w.polygon})),...bridges.map(b=>({id:b.id,polygon:bridgePolygon(b)}))]) {
    if(feature.polygon.some(p=>p.x<0 || p.y<0 || p.x>width || p.y>height))
      problems.push({code:"landscape-out-of-bounds",message:`landscape "${feature.id}" extends outside the world`});
  }
  for(const polygons of [waters.map(w=>w.polygon),bridges.map(bridgePolygon)]) for(let i=0;i<polygons.length;i++) for(let j=i+1;j<polygons.length;j++) {
    if(polygonsOverlap(polygons[i]!,polygons[j]!)) problems.push({code:"landscape-overlap",message:"water bodies and bridge decks must not overlap their own kind"});
  }
  for(const water of waters) {
    let escapes=false;
    for(let edge=0;edge<water.polygon.length;edge++) {
      const a=water.polygon[edge]!,b=water.polygon[(edge+1)%water.polygon.length]!,steps=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/20);
      for(let i=0;i<=steps;i++) if(terrainHeight(scene.terrain,a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps)<water.level-.5) escapes=true;
    }
    if(escapes) problems.push({code:"water-not-contained",message:`water "${water.id}" needs banks at or above its level`});
  }
  for(const bridge of bridges) {
    if(!bridgeFitsRoad(scene,bridge,frames))
      problems.push({code:"bridge-road-disconnected",message:`bridge "${bridge.id}" must carry the full road and curbs through both open ends, clear of side rails`});
    let unsafe=false;
    const {ux,uy}=bridgeCoordinates(bridge,bridge.a.x,bridge.a.y);
    for(let i=0;i<=30;i++) for(const across of [-bridge.width/2,0,bridge.width/2]) {
      const t=i/30,x=bridge.a.x+(bridge.b.x-bridge.a.x)*t-uy*across,y=bridge.a.y+(bridge.b.y-bridge.a.y)*t+ux*across;
      const deck=bridgeHeight(scene.terrain,bridge,t,across),ground=terrainHeight(scene.terrain,x,y);
      if(deck<ground-.5 || waterAt(scene.terrain,x,y,deck-.5)) unsafe=true;
    }
    if(unsafe) problems.push({code:"bridge-not-clear",message:`bridge "${bridge.id}" needs dry endpoints and a deck above ground and water`});
  }

  if (!mask.footprintClear(scene.spawn.x, scene.spawn.y, carRadius)) {
    problems.push({
      code: "spawn-not-clear",
      message: "spawn footprint does not fit on the road",
    });
  }

  // The island hole must survive: the sheet center is not road for a loop.
  if (scene.roadMaskRef.kind === "generated-rounded-rect-loop" && mask.isDrivable(width / 2, height / 2)) {
    problems.push({
      code: "island-filled",
      message: "center island is drivable; loop topology is broken",
    });
  }

  // Road quality is validated even when the player may explore off-road.
  // Flood through valid car centers, including solid obstacles, not raw road pixels.
  const stationary=(o:Scene['objects'][number])=>!isActor(o) || roleOf(o)==='npc' && !o.route;
  const solids = scene.objects.filter((o) => stationary(o) && archetypeOf(o).interaction === "solid")
    .flatMap((o) => objectContacts(scene,o))
    .concat(bridgeRails(scene.terrain).map(rail=>({...rail,bottom:-Infinity})));
  const maxRadius=Math.max(0,...solids.map(o=>o.r)),carHeight=playerHeight(scene);
  const solidGrid = new SpatialGrid(solids);
  const clearance = new RasterMask(width, height, undefined, mask.cellSize);
  const { columns, rows, cellSize } = mask;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      if (!mask.isDrivableAtPixel(x,y)) continue;
      const cx=(x+.5)*cellSize, cy=(y+.5)*cellSize;
      if (!mask.footprintClear(cx, cy, carRadius)) continue;
      const floor=drivingHeight(scene.terrain,cx,cy);
      if (solidGrid.query(cx,cy,carRadius+maxRadius).some((o) => floor<o.top-.05 && floor+carHeight>o.bottom+.05 && Math.hypot(cx - o.x, cy - o.y) < o.r + carRadius)) continue;
      clearance.data[y * columns + x] = 1;
    }
  }
  const reached = clearance.floodFrom(scene.spawn.x, scene.spawn.y);
  const reachedAt = (x: number, y: number) =>
    reached[Math.floor(y/cellSize) * columns + Math.floor(x/cellSize)] === 1;

  for (const cp of scene.checkpoints) {
    const mx = (cp.a.x + cp.b.x) / 2;
    const my = (cp.a.y + cp.b.y) / 2;
    if (!mask.footprintClear(mx, my, carRadius)) {
      problems.push({
        code: "checkpoint-not-on-road",
        message: `checkpoint "${cp.id}" midpoint does not fit the car footprint`,
      });
    } else if (!reachedAt(mx, my)) {
      problems.push({
        code: "checkpoint-unreachable",
        message: `checkpoint "${cp.id}" has no road route from spawn with car clearance`,
      });
    }
  }

  for (const region of scene.regions) {
    for (const p of region.polygon) {
      if (p.x < 0 || p.y < 0 || p.x > width || p.y > height) {
        problems.push({
          code: "region-out-of-bounds",
          message: `region "${region.id}" has a vertex outside the sheet`,
        });
        break;
      }
    }
    const cx = region.polygon.reduce((s, p) => s + p.x, 0) / region.polygon.length;
    const cy = region.polygon.reduce((s, p) => s + p.y, 0) / region.polygon.length;
    if (!pointInPolygon(cx, cy, region.polygon) || !mask.isDrivable(cx, cy)) {
      problems.push({
        code: "region-off-road",
        message: `region "${region.id}" center is not on the road`,
      });
    }
  }

  // Objects: inside the sheet, and solids must never seal the racing line
  // (spawn and checkpoint midpoints keep a full car footprint of clearance).
  const routePoints = [
    { x: scene.spawn.x, y: scene.spawn.y },
    ...scene.checkpoints.map((cp) => ({
      x: (cp.a.x + cp.b.x) / 2,
      y: (cp.a.y + cp.b.y) / 2,
    })),
  ];
  for (const object of scene.objects) {
    const r = objectRadius(object);
    if (object.x < 0 || object.y < 0 || object.x > width || object.y > height) {
      problems.push({
        code: "object-out-of-bounds",
        message: `object "${object.id}" is outside the sheet`,
      });
      continue;
    }
    if (isActor(object) || archetypeOf(object).interaction !== "solid") continue;
    for (const p of routePoints) {
      const floor=drivingHeight(scene.terrain,p.x,p.y);
      if (objectContacts(scene,object).some(c=>floor<c.top-.05 && floor+carHeight>c.bottom+.05 && Math.hypot(c.x-p.x,c.y-p.y)<c.r+carRadius+2)) {
        problems.push({
          code: "object-blocks-route",
          message: `solid object "${object.id}" blocks the spawn/checkpoint line`,
        });
        break;
      }
    }
  }

  for(const route of scene.routes)if(route.points.some(p=>p.x<40 || p.y<40 || p.x>width-40 || p.y>height-40))
    problems.push({code:"route-not-clear",message:`route "${route.id}" infrastructure must stay inside the world`});
  // Explicit width reserves infrastructure, including paths with no moving actor.
  const pathContacts=scene.objects.filter(o=>stationary(o) && archetypeOf(o).interaction!=="decor").flatMap(o=>objectContacts(scene,o));
  for(const surface of [...scene.surfaces,...scene.markings])if(surface.points.some(p=>p.x<0 || p.y<0 || p.x>width || p.y>height))
    problems.push({code:'landscape-out-of-bounds',message:`ground feature "${surface.id}" extends outside the world`});
  for(const marking of scene.markings)if(markingPolygons(marking).flat().some(p=>p.x<0 || p.y<0 || p.x>width || p.y>height))
    problems.push({code:'landscape-out-of-bounds',message:`marking "${marking.id}" paint width extends outside the world`});
  const streetGround=streetFootprints(scene);
  for(const surface of scene.surfaces)if(streetGround.roads.some(r=>polygonsOverlap(surface.points,rectPolygon(r))))
    problems.push({code:'landscape-overlap',message:`ground surface "${surface.id}" overlaps a street carriageway`});
  for(const street of scene.streets){
    const carriageways=streetRects([street]),reserved=streetRects([street],true);
    if(reserved.some(r=>r.x0<0 || r.y0<0 || r.x1>width || r.y1>height))problems.push({code:'landscape-out-of-bounds',message:`street "${street.id}" extends outside the world`});
    if(carriageways.some(r=>waters.some(w=>polygonsOverlap(rectPolygon(r),w.polygon))))problems.push({code:'route-not-clear',message:`street "${street.id}" crosses water; use a bridge-connected road instead`});
    const contact=pathContacts.find(c=>carriageways.some(r=>{
      const x=Math.max(r.x0,Math.min(r.x1,c.x)),y=Math.max(r.y0,Math.min(r.y1,c.y)),floor=drivingHeight(scene.terrain,x,y);
      return Math.hypot(c.x-x,c.y-y)<c.r+2 && c.bottom<floor+24 && c.top>floor+.05;
    }));
    if(contact)problems.push({code:'route-not-clear',message:`street "${street.id}" is obstructed near ${Math.round(contact.x)},${Math.round(contact.y)}`});
  }
  // Every street component must reach the original circuit. A visually isolated grid is not accepted.
  const pending=new Set(scene.streets),connected:ReturnType<typeof streetRects>=[];
  let changed=true;
  while(changed){changed=false;for(const street of pending){const rects=streetRects([street]);
    if(rects.some(r=>path.some(p=>p.x>=r.x0-halfRoad && p.x<=r.x1+halfRoad && p.y>=r.y0-halfRoad && p.y<=r.y1+halfRoad) || connected.some(c=>r.x0<=c.x1 && r.x1>=c.x0 && r.y0<=c.y1 && r.y1>=c.y0))){pending.delete(street);connected.push(...rects);changed=true;}
  }}
  for(const street of pending)problems.push({code:'route-not-clear',message:`street "${street.id}" has no connection to the circuit`});
  const groundRoutes=scene.routes.filter(r=>r.kind!=="water" && r.kind!=="ambient").map(route=>({route,...routeInfrastructure(route)}));
  for(const route of scene.routes.filter(r=>r.kind==="path" && r.width!==undefined)){
    let obstruction:string|undefined;
    const frames=routeFrames(route),anchors=routePath(route).points;
    const sharp=anchors.some((p,i)=>{
      const a=anchors[i-1]??(route.mode==="loop" ? anchors.at(-2)! : undefined),b=anchors[i+1]??(route.mode==="loop" ? anchors[1]! : undefined);
      return a && b && ((p.x-a.x)*(b.x-p.x)+(p.y-a.y)*(b.y-p.y))/(Math.hypot(p.x-a.x,p.y-a.y)*Math.hypot(b.x-p.x,b.y-p.y))<-.5;
    });
    for(let i=0;i<frames.length;i++){
      const p=frames[i]!,next=frames[i+1],dx=next ? next.x-p.x : 0,dy=next ? next.y-p.y : 0;
      if(sharp || next && dx*dx+dy*dy-Math.abs(route.width!/2*((next.nx-p.nx)*dx+(next.ny-p.ny)*dy))<=(dx*dx+dy*dy)*.05){obstruction="a bend too tight for its width";break;}
      const radius=route.width!/2*Math.hypot(p.nx,p.ny)+4,margin=radius+8,floor=drivingHeight(scene.terrain,p.x,p.y);
      const object=pathContacts.find(c=>Math.hypot(c.x-p.x,c.y-p.y)<c.r+margin && c.bottom<floor+24 && c.top>floor);
      if(p.x<margin || p.y<margin || p.x>width-margin || p.y>height-margin)obstruction="world boundary";
      else if(distanceToRoad(path,p.x,p.y)<halfRoad+ROAD_CURB_WIDTH+margin)obstruction="racing road and curbs";
      else if(waters.some(w=>pointInPolygon(p.x,p.y,w.polygon) || distanceToRoad([...w.polygon,w.polygon[0]!],p.x,p.y)<margin))obstruction="water bank";
      else if(object)obstruction=`placed object "${object.id}"`;
      else if(streetGround.reserved.some(r=>inRect(r,p.x,p.y,margin)))obstruction='a street and sidewalk';
      else {
        const other=groundRoutes.find(other=>other.route!==route && distanceToRoad(other.points,p.x,p.y)<margin+other.radius);
        if(other)obstruction=other.route.kind==="air" ? "runway" : "another ground route";
      }
      if(obstruction)break;
    }
    if(obstruction){
      const reason=obstruction==="a bend too tight for its width" ? "bend too tight for its width; widen the turn or reduce the width" : `corridor overlaps ${obstruction}; reserve its full width plus 8 units of clearance`;
      problems.push({code:"route-not-clear",message:`path "${route.id}" ${reason}`});
    }
  }
  for(const object of scene.objects.filter(o=>o.route && roleOf(o)==='npc')){
    const route=scene.routes.find(r=>r.id===object.route!.id)!,path=routePath(route),radius=route.kind==="ambient" ? assemblyHorizontalRadius(object.spec as import("./object-dsl").ObjectDsl,object.scale) : objectRadius(object),bodyHeight=objectHeight(object);
    let invalid=false;
    const steps=Math.ceil(path.length/12);
    for(let sample=0;sample<=steps;sample++){
      const d=sample/steps*path.length;
      const p=routePoint(route,d);
      if(p.x<radius || p.y<radius || p.x>width-radius || p.y>scene.canonical.height-radius){invalid=true;break;}
      if(route.kind==="ambient" && !route.altitude && Array.from({length:9},(_,i)=>i===8 ? p : {x:p.x+Math.cos(i*Math.PI/4)*radius,y:p.y+Math.sin(i*Math.PI/4)*radius}).some(q=>waterAt(scene.terrain,q.x,q.y))){invalid=true;break;}
      if(route.kind==="water"){
        if(!scene.terrain.landscape?.waters.some(w=>pointInPolygon(p.x,p.y,w.polygon))) {invalid=true;break;}
        for(let i=0;i<8;i++){
          const x=p.x+Math.cos(i*Math.PI/4)*radius,y=p.y+Math.sin(i*Math.PI/4)*radius;
          if(!scene.terrain.landscape?.waters.some(w=>pointInPolygon(x,y,w.polygon) && terrainHeight(scene.terrain,x,y)<w.level-.2))invalid=true;
        }
        // shortcut: boats cannot pass under heightfield bridge decks; add layered ground before permitting it.
        if(bridges.some(bridge=>{
          const {t,across,length}=bridgeCoordinates(bridge,p.x,p.y);
          return Math.hypot(Math.max(0,-t*length,(t-1)*length),Math.max(0,Math.abs(across)-bridge.width/2))<radius;
        }))invalid=true;
        if(invalid)break;
      }
      const bottom=routeElevation(scene,route,p,d),top=bottom+bodyHeight;
      if(solidGrid.query(p.x,p.y,radius+maxRadius).some(c=>bottom<c.top-.05 && top>c.bottom+.05 && Math.hypot(c.x-p.x,c.y-p.y)<radius+c.r)){invalid=true;break;}
    }
    if(invalid)problems.push({code:"route-not-clear",message:`route for "${object.id}" must keep its body in bounds, clear of solids and in navigable water when afloat`});
  }

  const parkedContacts=actorContacts(scene,0);
  for(const object of scene.objects.filter(o=>roleOf(o)==='npc' && !o.route)){
    const p=actorPose(scene,object,0),radius=assemblyHorizontalRadius(object.spec as import('./object-dsl').ObjectDsl,object.scale),height=objectHeight(object);
    const wet=Array.from({length:9},(_,i)=>i===8 ? p : {x:p.x+Math.cos(i*Math.PI/4)*radius,y:p.y+Math.sin(i*Math.PI/4)*radius}).some(q=>waterAt(scene.terrain,q.x,q.y));
    const blocked=[...solidGrid.query(p.x,p.y,radius+maxRadius),...parkedContacts].some(c=>c.id!==object.id && p.elevation<c.top-.05 && p.elevation+height>c.bottom+.05 && Math.hypot(c.x-p.x,c.y-p.y)<radius+c.r);
    const outside=p.x<radius || p.y<radius || p.x>width-radius || p.y>scene.canonical.height-radius;
    if(wet || blocked || outside)problems.push({code:'route-not-clear',message:`NPC "${object.id}" needs a dry, unobstructed starting footprint inside the world`});
  }
  for(const object of scene.objects.filter(o=>controlFor(o))){
    const pose=actorPose(scene,object,0),radius=objectRadius(object),height=objectHeight(object);
    let invalid=pose.x<radius || pose.y<radius || pose.x>width-radius || pose.y>scene.canonical.height-radius;
    if(controlOf(object.spec)==="boat"){
      const support=Math.max(radius,assemblyHorizontalRadius(object.spec as import("./object-dsl").ObjectDsl,object.scale));
      for(let i=0;i<12;i++){
        const x=pose.x+Math.cos(i*Math.PI/6)*support,y=pose.y+Math.sin(i*Math.PI/6)*support,floor=drivingHeight(scene.terrain,x,y),water=waterAt(scene.terrain,x,y,floor);
        if(!water || floor>=water.level-.5)invalid=true;
      }
    }
    if(controlOf(object.spec)==="plane" && waterAt(scene.terrain,pose.x,pose.y,pose.elevation))invalid=true;
    if(solidGrid.query(pose.x,pose.y,radius+maxRadius).some(c=>pose.elevation<c.top-.05 && pose.elevation+height>c.bottom+.05 && Math.hypot(c.x-pose.x,c.y-pose.y)<radius+c.r))invalid=true;
    if(parkedContacts.some(c=>c.id!==object.id && pose.elevation<c.top-.05 && pose.elevation+height>c.bottom+.05 && Math.hypot(c.x-pose.x,c.y-pose.y)<radius+c.r))invalid=true;
    const spawnFloor=drivingHeight(scene.terrain,scene.spawn.x,scene.spawn.y);
    if(pose.elevation<spawnFloor+carHeight && pose.elevation+height>spawnFloor && Math.hypot(pose.x-scene.spawn.x,pose.y-scene.spawn.y)<radius+carRadius)invalid=true;
    if(invalid)problems.push({code:"route-not-clear",message:`vehicle "${object.id}" needs a clear starting body; boats need full-hull navigable water and planes need dry ground`});
  }

  return problems;
}
