import type {Scene} from './schema';
import type {CarState} from '../sim/car';
import type {Contact} from './contacts';

export const GROWTH_LIMITS=Object.freeze({plants:32,minSeconds:30,maxSeconds:86400,minScale:.1,maxScale:.5,seedScale:.15,workerServices:4});
export interface GrowingPlant {objectId:string;serviceId:string;plantedAtS:number;progressS:number}
const empty:ReadonlyMap<string,number>=new Map();
const cache=new WeakMap<Scene,WeakMap<GrowingPlant[],ReadonlyMap<string,number>>>();
/** Derived scales share the immutable growth snapshot across collision and rendering. */
export function growthScales(scene:Scene,plants:GrowingPlant[]|undefined):ReadonlyMap<string,number>{
 if(!plants?.length)return empty;
 let entries=cache.get(scene);if(!entries){entries=new WeakMap();cache.set(scene,entries);}let values=entries.get(plants);
 if(!values){values=new Map(plants.map(p=>{const r=scene.economy!.repairs.find(r=>r.id===p.serviceId)!,start=r.seed_scale??GROWTH_LIMITS.seedScale;return [p.objectId,start+(1-start)*p.progressS/r.regrow_s!];}));entries.set(plants,values);}return values;
}
export const growthScale=(scene:Scene,state:Pick<CarState,'growing'>,id:string)=>growthScales(scene,state.growing).get(id)??1;
export function growthContact(c:Contact,base:number,scale:number):Contact{return scale===1 ? c : {...c,r:c.r*scale,bottom:c.bottom===-Infinity ? c.bottom : base+(c.bottom-base)*scale,top:base+(c.top-base)*scale};}
