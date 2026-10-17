import {MAX_WORLD_SIZE} from './world-bounds';
import { z } from "zod";
import { bridgeAt, bridgeCoordinates, landscapeSchema, waterContains, waterDistance, type Bridge } from "./landscape-dsl";

/** Bounded scene data shared by simulation, navigation and rendering. */
export const terrainSchema = z.object({
  landscape: landscapeSchema.optional(),
  hills: z.array(z.object({
    id: z.string().min(1).max(40),
    x: z.number().finite().min(0).max(MAX_WORLD_SIZE),
    y: z.number().finite().min(0).max(MAX_WORLD_SIZE),
    radiusX: z.number().finite().min(120).max(1600),
    radiusY: z.number().finite().min(120).max(1600),
    height: z.number().finite().min(0).max(320),
  }).strict()).max(16),
  tints: z.array(z.object({
    x:z.number().min(0).max(MAX_WORLD_SIZE),y:z.number().min(0).max(MAX_WORLD_SIZE),
    radius:z.number().min(120).max(3000),color:z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }).strict()).max(16).optional(),
}).strict().superRefine(({ hills }, ctx) => {
  if (new Set(hills.map((h) => h.id)).size !== hills.length)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "duplicate hill id" });
});

export type Terrain = z.infer<typeof terrainSchema>;

/** bend is vertical acceleration needed to follow the surface at vx/vy. */
function baseTerrain(terrain: Terrain, x: number, y: number, vx = 0, vy = 0) {
  let height = 0, dx = 0, dy = 0, bend = 0;
  for (const hill of terrain.hills) {
    const px = x - hill.x, py = y - hill.y;
    const rx2 = hill.radiusX ** 2, ry2 = hill.radiusY ** 2;
    const f = Math.max(0, 1 - px * px / rx2 - py * py / ry2);
    if(f===0)continue;
    // Compact support with a smooth shoulder; hills blend without seams.
    height += hill.height * f ** 3;
    dx -= 6 * hill.height * f ** 2 * px / rx2;
    dy -= 6 * hill.height * f ** 2 * py / ry2;
    bend += hill.height * (24 * f * (px * vx / rx2 + py * vy / ry2) ** 2
      - 6 * f ** 2 * (vx * vx / rx2 + vy * vy / ry2));
  }
  return height >= 320 ? { height: 320, dx: 0, dy: 0, bend: 0 } : { height, dx, dy, bend };
}

/** Ground stays below the deck so a bridge has a visible opening above the river. */
export function terrainHeight(terrain:Terrain,x:number,y:number):number {
  let height=baseTerrain(terrain,x,y).height;
  for(const water of terrain.landscape?.waters ?? []) {
    const distance=waterDistance(water,x,y);
    if(distance<=0) continue;
    const t=Math.min(1,distance/water.bankWidth),blend=t*t*(3-2*t);
    height=Math.min(height,height+(water.level-water.depth-height)*blend);
  }
  return height;
}

export function bridgeHeight(terrain:Terrain,bridge:Bridge,t:number,across=0):number {
  const {ux,uy,length}=bridgeCoordinates(bridge,bridge.a.x,bridge.a.y);
  const a=terrainHeight(terrain,bridge.a.x-uy*across,bridge.a.y+ux*across),b=terrainHeight(terrain,bridge.b.x-uy*across,bridge.b.y+ux*across);
  const x=bridge.a.x+(bridge.b.x-bridge.a.x)*t-uy*across,y=bridge.a.y+(bridge.b.y-bridge.a.y)*t+ux*across;
  const ground=terrainHeight(terrain,x,y),endDistance=Math.min(t,1-t)*length;
  // Keep an entire terrain cell at each end identical to the bank before easing onto the span.
  const blend=Math.max(0,Math.min(1,(endDistance-24)/(Math.min(60,length/2)-24)));
  // Match height, slope and curvature at each ramp shoulder, including crest-driving forces.
  const ease=blend**3*(blend*(blend*6-15)+10);
  return ground+(a+(b-a)*t+Math.sin(Math.PI*t)**2*bridge.archHeight-ground)*ease;
}
export function drivingHeight(terrain:Terrain,x:number,y:number):number {
  const bridge=bridgeAt(terrain.landscape,x,y);
  return bridge ? bridgeHeight(terrain,bridge,bridgeCoordinates(bridge,x,y).t,bridgeCoordinates(bridge,x,y).across) : terrainHeight(terrain,x,y);
}

export const TERRAIN_STEP = 20;
/** Height of the rendered ground/deck triangles, including between their vertices. */
export function terrainSurfaceHeight(terrain: Terrain, x: number, y: number, heightAt?: (x:number,y:number)=>number): number {
  const bridge=heightAt ? undefined : bridgeAt(terrain.landscape,x,y);
  const sample=heightAt ?? (bridge ? (x:number,y:number)=>{const p=bridgeCoordinates(bridge,x,y);return bridgeHeight(terrain,bridge,p.t,p.across);} : (x:number,y:number)=>terrainHeight(terrain,x,y));
  const gx=Math.floor(x/TERRAIN_STEP)*TERRAIN_STEP, gy=Math.floor(y/TERRAIN_STEP)*TERRAIN_STEP;
  const u=(x-gx)/TERRAIN_STEP, v=(y-gy)/TERRAIN_STEP;
  const nw=sample(gx,gy), ne=sample(gx+TERRAIN_STEP,gy), sw=sample(gx,gy+TERRAIN_STEP);
  return u+v<=1 ? nw+(ne-nw)*u+(sw-nw)*v
    : sample(gx+TERRAIN_STEP,gy+TERRAIN_STEP)*(u+v-1)+ne*(1-v)+sw*(1-u);
}

/** Local deck derivatives avoid a fictitious vertical slope at its side edge. */
export function sampleTerrain(terrain:Terrain,x:number,y:number,vx=0,vy=0) {
  const bridge=bridgeAt(terrain.landscape,x,y);
  if(bridge) {
    const {t,length,ux,uy,across}=bridgeCoordinates(bridge,x,y),e=.5;
    const h=(u:number,v:number)=>bridgeHeight(terrain,bridge,u,v),height=h(t,across);
    const alongSlope=(h(t+e/length,across)-h(t-e/length,across))/(2*e);
    const crossSlope=(h(t,across+e)-h(t,across-e))/(2*e);
    const speed=Math.hypot(vx,vy),alongSpeed=(vx*ux+vy*uy)/(speed||1),crossSpeed=(-vx*uy+vy*ux)/(speed||1);
    const bend=(h(t+alongSpeed*e/length,across+crossSpeed*e)+h(t-alongSpeed*e/length,across-crossSpeed*e)-2*height)*speed**2/(e*e);
    return {height,dx:ux*alongSlope-uy*crossSlope,dy:uy*alongSlope+ux*crossSlope,bend};
  }
  if(!terrain.landscape?.waters.some(w=>waterContains(w,x,y))) return baseTerrain(terrain,x,y,vx,vy);
  const h=terrainHeight(terrain,x,y),e=.5,speed=Math.hypot(vx,vy),ux=speed ? vx/speed : 0,uy=speed ? vy/speed : 0;
  return {height:h,dx:(terrainHeight(terrain,x+e,y)-terrainHeight(terrain,x-e,y))/(2*e),
    dy:(terrainHeight(terrain,x,y+e)-terrainHeight(terrain,x,y-e))/(2*e),
    bend:speed**2*(terrainHeight(terrain,x+ux*e,y+uy*e)+terrainHeight(terrain,x-ux*e,y-uy*e)-2*h)/(e*e)};
}

export function waterAt(terrain:Terrain,x:number,y:number,elevation=drivingHeight(terrain,x,y)) {
  return terrain.landscape?.waters.find(w=>elevation<w.level+.5 && waterContains(w,x,y) && terrainHeight(terrain,x,y)<w.level-.1);
}

/** Water owns boat support; a road deck only blocks a hull without headroom. */
export function navigableWater(terrain:Terrain,x:number,y:number,radius:number,height:number){
  const water=waterAt(terrain,x,y,terrainHeight(terrain,x,y));if(!water)return;
  for(let i=0;i<=12;i++){
    const px=x+(i===12 ? 0 : Math.cos(i*Math.PI/6)*radius),py=y+(i===12 ? 0 : Math.sin(i*Math.PI/6)*radius),floor=terrainHeight(terrain,px,py);
    if(floor>=water.level-.5 || waterAt(terrain,px,py,floor)?.id!==water.id)return;
    const bridge=bridgeAt(terrain.landscape,px,py);
    if(bridge){const p=bridgeCoordinates(bridge,px,py);if(water.level-2+height>bridgeHeight(terrain,bridge,p.t,p.across)-4)return;}
  }
  return water;
}

/** The underside of a water crossing, sampled over the complete moving footprint. */
export function waterCeiling(terrain:Terrain,x:number,y:number,radius:number):number {
  let ceiling=Infinity;
  for(let i=0;i<=12;i++){
    const px=x+(i===12 ? 0 : Math.cos(i*Math.PI/6)*radius),py=y+(i===12 ? 0 : Math.sin(i*Math.PI/6)*radius),bridge=bridgeAt(terrain.landscape,px,py);
    if(bridge){const p=bridgeCoordinates(bridge,px,py);ceiling=Math.min(ceiling,bridgeHeight(terrain,bridge,p.t,p.across)-4);}
  }
  return ceiling;
}

/** Dense small cylinders share the existing conservative footprint collision path. */
export function bridgeRails(terrain:Terrain) {
  return (terrain.landscape?.bridges ?? []).filter(b=>b.rails).flatMap(bridge=> {
    const {length,ux,uy}=bridgeCoordinates(bridge,bridge.a.x,bridge.a.y),steps=Math.ceil(length/5),result=[];
    for(const side of [-1,1]) for(let i=0;i<=steps;i++) {
      const t=i/steps;
      result.push({x:bridge.a.x+ux*length*t-uy*bridge.width/2*side,
        y:bridge.a.y+uy*length*t+ux*bridge.width/2*side,r:3,bottom:bridgeHeight(terrain,bridge,t,bridge.width/2*side)-3,top:bridgeHeight(terrain,bridge,t,bridge.width/2*side)+21});
    }
    return result;
  });
}
