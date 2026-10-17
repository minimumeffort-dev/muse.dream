import type {Point} from '../scene/schema';

/** Canonical coordinates, aligned to the same lattice as the resident terrain. */
export type RenderRegion={x0:number;y0:number;x1:number;y1:number};
export const WORLD_CHUNK_SIZE=800;
export function contains(region:RenderRegion,x:number,y:number):boolean{return x>=region.x0 && x<region.x1 && y>=region.y0 && y<region.y1;}
export function overlaps(region:RenderRegion,points:Point[]):boolean{
  return points.some(p=>p.x>=region.x0) && points.some(p=>p.x<=region.x1) && points.some(p=>p.y>=region.y0) && points.some(p=>p.y<=region.y1);
}
