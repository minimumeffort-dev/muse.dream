import type { Point, Scene } from "./schema";
import { bridgeCoordinates, bridgePolygon, polygonsOverlap, clipPolygon, type Bridge } from "./landscape-dsl";

/** Shared sampled centerline: mask, road mesh, markings and map use identical geometry. */
export function roadPoints(scene: Scene): Point[] {
  const ref = scene.roadMaskRef;
  if(ref.kind==='street-network')return [];
  if (ref.kind === "generated-spline-loop") {
    const points = ref.params.points, result: Point[] = [];
    for (let i = 0;i < points.length;i++) {
      const a = points[(i + points.length - 1) % points.length]!, b = points[i]!,
        c = points[(i + 1) % points.length]!, d = points[(i + 2) % points.length]!;
      const steps = Math.ceil(Math.hypot(c.x - b.x, c.y - b.y) / 16);
      for (let j = 0;j < steps;j++) {
        const t = j / steps;
        const sample = (v0: number, v1: number, v2: number, v3: number) =>
          .5 * (2 * v1 + (-v0 + v2) * t + (2 * v0 - 5 * v1 + 4 * v2 - v3) * t * t + (-v0 + 3 * v1 - 3 * v2 + v3) * t * t * t);
        result.push({ x: sample(a.x, b.x, c.x, d.x), y: sample(a.y, b.y, c.y, d.y) });
      }
    }
    return [...result, { ...result[0]! }];
  }
  const { outer, roadWidth } = ref.params, h = roadWidth / 2;
  const x = outer.x + h, y = outer.y + h, w = outer.width - roadWidth, height = outer.height - roadWidth;
  const r = Math.max(1, outer.radius - h), result: Point[] = [];
  const corners = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + height - r, 0], [x + r, y + height - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (let k = 0;k < 4;k++) {
    const [cx, cy, angle] = corners[k]! as [number, number, number];
    const arcSteps = Math.ceil(r * Math.PI / 2 / 12);
    const arc = Array.from({ length: arcSteps + 1 }, (_, i) => {
      const t = angle + i / arcSteps * Math.PI / 2;
      return { x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r };
    });
    if (result.length) {
      const a = result[result.length - 1]!, b = arc[0]!, n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12);
      for (let i = 1;i < n;i++) result.push({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n });
    }
    result.push(...arc);
  }
  const a = result[result.length - 1]!, b = result[0]!, n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12);
  for (let i = 1;i <= n;i++) result.push({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n });
  return result;
}

export function distanceToRoad(points: Point[], x: number, y: number): number {
  let min = Infinity;
  for (let i = 1;i < points.length;i++) {
    const a = points[i - 1]!, b = points[i]!, dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    min = Math.min(min, (x - a.x - t * dx) ** 2 + (y - a.y - t * dy) ** 2);
  }
  return Math.sqrt(min);
}

export const ROAD_CURB_WIDTH=7;
export const ROAD_SURFACE_LIFT=1.5;
export interface RoadFrame extends Point { nx:number;ny:number;distance:number }

export function roadRibbon(a: RoadFrame, b: RoadFrame, inner: number, outer: number): Point[] {
  const point=(p:RoadFrame,offset:number)=>({x:p.x+p.nx*offset,y:p.y+p.ny*offset});
  return [point(a,inner),point(b,inner),point(b,outer),point(a,outer)];
}

const footprints=new WeakMap<Scene,Point[][]>();
/** The same corridor owns the asphalt and the opening in a bridge's top surface. */
export function roadFootprint(scene:Scene):Point[][] {
  let polygons=footprints.get(scene);
  if(!polygons) {
    const frames=roadFrames(scene),half=scene.roadMaskRef.params.roadWidth/2;
    polygons=frames.slice(1).map((b,i)=>roadRibbon(frames[i]!,b,-half,half));footprints.set(scene,polygons);
  }
  return polygons;
}

/** A road may traverse a deck through its open ends, with its full width clear of the side rails. */
export function bridgeFitsRoad(scene:Scene,bridge:Bridge,frames=roadFrames(scene)):boolean {
  const outline=bridgePolygon(bridge),edge=scene.roadMaskRef.params.roadWidth/2+ROAD_CURB_WIDTH/2;
  const available=bridge.width/2-(bridge.rails ? 6 : 0);
  let overlaps=false,enters=false,exits=false;
  for(let i=1;i<frames.length;i++) {
    const a=frames[i-1]!,b=frames[i]!,ribbon=roadRibbon(a,b,-edge,edge);
    if(!polygonsOverlap(ribbon,outline))continue;
    overlaps=true;
    let strip=ribbon.map(point=>{const p=bridgeCoordinates(bridge,point.x,point.y);return {x:p.t,y:p.across};});
    strip=clipPolygon(strip,p=>p.x);strip=clipPolygon(strip,p=>1-p.x);
    if(strip.some(p=>Math.abs(p.y)>available+.001))return false;
    const start=bridgeCoordinates(bridge,a.x,a.y),end=bridgeCoordinates(bridge,b.x,b.y),dt=end.t-start.t;
    if(Math.abs(dt)<1e-9)continue;
    for(const cap of [0,1]) {
      const t=(cap-start.t)/dt;
      if(t<0 || t>1)continue;
      if(Math.abs(start.across+(end.across-start.across)*t)>available)continue;
      if(cap===0)enters=true;else exits=true;
    }
  }
  return !overlaps || enters && exits;
}

/** Canonical cross-sections shared by render compilation and bend validation. */
export function roadFrames(scene:Scene):RoadFrame[] {
  const points=roadPoints(scene),n=points.length-1;let distance=0;
  return points.map((point,i)=>{
    const before=points[(i-1+n)%n]!,after=points[(i+1)%n]!;
    const length=Math.hypot(after.x-before.x,after.y-before.y);
    if(i>0)distance+=Math.hypot(point.x-points[i-1]!.x,point.y-points[i-1]!.y);
    return {...point,nx:-(after.y-before.y)/length,ny:(after.x-before.x)/length,distance};
  });
}
