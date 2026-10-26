import {z} from 'zod';

export const WORK_GESTURE_LIMITS=Object.freeze({gestures:8,keys:8,minCycleS:.6,maxCycleS:8,minGap:.1,maxSpeed:12});
const hand=z.tuple([z.number().finite().min(-1.25).max(1.25),z.number().finite().min(.6).max(3),z.number().finite().min(-3).max(3)]);
const key=z.object({t:z.number().finite().min(0).max(1),left:hand,right:hand}).strict();
export const workGestureSchema=z.object({id:z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),cycle_s:z.number().finite().min(WORK_GESTURE_LIMITS.minCycleS).max(WORK_GESTURE_LIMITS.maxCycleS),keys:z.array(key).min(2).max(WORK_GESTURE_LIMITS.keys)}).strict().superRefine((g,ctx)=>{
 const issue=(message:string,path:(string|number)[])=>ctx.addIssue({code:'custom',message,path});
 if(g.keys.length<2)return;
 if(g.keys[0]!.t!==0 || g.keys.at(-1)!.t!==1)issue('gesture keys must start at t=0 and end at t=1',['keys']);
 for(const side of ['left','right'] as const)if(g.keys[0]![side].some((n,i)=>Math.abs(n-g.keys.at(-1)![side][i]!)>1e-8))issue('gesture must close with identical first and last hand positions',['keys']);
 for(const [i,k] of g.keys.entries()){
  if(k.left[2]<.6 || k.right[2]>-.6)issue('gesture keeps left Z >= .6 and right Z <= -.6 to separate the hands',['keys',i]);
  if(!i)continue;const previous=g.keys[i-1]!,gap=k.t-previous.t;
  if(gap<WORK_GESTURE_LIMITS.minGap-1e-8)issue('gesture keys must increase by at least .1 of the cycle',['keys',i,'t']);
  else for(const side of ['left','right'] as const)if(1.5*Math.hypot(...k[side].map((n,j)=>n-previous[side][j]!))/(gap*g.cycle_s)>WORK_GESTURE_LIMITS.maxSpeed+1e-8)issue('gesture hand segment exceeds 12 world units per second',['keys',i,side]);
 }
});
export type WorkGesture=z.infer<typeof workGestureSchema>;

/** Smooth bounded interpolation; callers reuse their target vectors. */
export function sampleWorkGesture(g:WorkGesture,elapsedS:number,left:{x:number;y:number;z:number},right:{x:number;y:number;z:number}):void{
 const phase=(Math.max(0,elapsedS)/g.cycle_s)%1;let i=1;while(i<g.keys.length-1 && phase>g.keys[i]!.t)i++;
 const a=g.keys[i-1]!,b=g.keys[i]!,t=(phase-a.t)/(b.t-a.t),weight=t*t*(3-2*t);
 for(const [side,out] of [['left',left],['right',right]] as const){const p=a[side],q=b[side];out.x=p[0]+(q[0]-p[0])*weight;out.y=p[1]+(q[1]-p[1])*weight;out.z=p[2]+(q[2]-p[2])*weight;}
}
