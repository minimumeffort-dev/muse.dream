import {z} from 'zod';
import {objectDslSchema,isReactive,type ObjectDslV2} from './object-dsl';
import {HUMANOID_BONES} from './humanoid';
import {measuredScale} from './measure';

export const MATCH_LIMITS=Object.freeze({teamSize:6,seconds:[30,900] as const,score:21,tickSeconds:.05});
const athlete=objectDslSchema.transform((spec,ctx)=>{
 if(spec.dslVersion!==2){ctx.addIssue({code:'custom',message:'team object requires a Dream 2 humanoid'});return z.NEVER;}
 const scale=measuredScale(spec),height=(spec.body.colliderHeight??0)*scale;
 if(spec.measure?.kind!=='person' || spec.body.interaction!=='decor' || !HUMANOID_BONES.every(b=>spec.joints?.some(j=>j.bone===b)) || spec.foundation || spec.grounding==='surface' || spec.contacts || spec.rideable || spec.seats || spec.emitter || spec.lamp || spec.interior || isReactive(spec) || spec.joints?.some(j=>j.animation || j.proximity) || spec.parts.some(p=>p.animation) || spec.body.colliderRadius*scale<2 || spec.body.colliderRadius*scale>8 || height<12 || height>28)
  ctx.addIssue({code:'custom',message:'team object needs a complete upright measured decor humanoid, radius 2..8 and height 12..28, without other mechanisms'});
 return spec as ObjectDslV2;
});
export const matchTeamSchema=z.object({id:z.enum(['home','away']),role:z.literal('npc'),keeper:z.number().int().min(0).max(5).optional(),keeperSpec:athlete.optional(),specs:z.array(athlete).min(1).max(4),members:z.array(z.string().regex(/^[a-z][a-z0-9_]{0,39}$/).refine(id=>id!=='player','player is reserved for the active player')).max(MATCH_LIMITS.teamSize).default([]),style:z.enum(['balanced','press','counter']).default('balanced'),skill:z.number().finite().min(.3).max(1).default(.7)}).strict();
export const matchSchema=z.object({rosterId:z.string().regex(/^[a-z][a-z0-9_]{0,39}$/).optional(),teamSize:z.number().int().min(2).max(MATCH_LIMITS.teamSize),durationS:z.number().finite().min(MATCH_LIMITS.seconds[0]).max(MATCH_LIMITS.seconds[1]).default(180),scoreTo:z.number().int().min(1).max(MATCH_LIMITS.score).default(5),teams:z.array(matchTeamSchema).length(2)}).strict().superRefine((match,ctx)=>{
 if(new Set(match.teams.map(t=>t.id)).size!==2)ctx.addIssue({code:'custom',path:['teams'],message:'match needs one home team and one away team'});
 const members=match.teams.flatMap(t=>t.members);
 if(new Set(members).size!==members.length)ctx.addIssue({code:'custom',path:['teams'],message:'team members must be unique NPC references'});
 for(const [i,team] of match.teams.entries())if(team.keeper!==undefined && team.keeper>=match.teamSize-Number(team.id==='home'))ctx.addIssue({code:'custom',path:['teams',i,'keeper'],message:'keeper index must name one NPC on that side'});
 for(const [i,team] of match.teams.entries())if(team.members.length>match.teamSize-Number(team.id==='home'))ctx.addIssue({code:'custom',path:['teams',i,'members'],message:'home reserves one place for the player; NPC members must fit the side'});
});
export type MatchDefinition=z.infer<typeof matchSchema>;
export type MatchSide='home'|'away';
export const teamNpcCount=(match:MatchDefinition)=>match.teamSize*2-1;
export function matchRoster(sportId:string,match:MatchDefinition){
 return match.teams.flatMap(team=>Array.from({length:match.teamSize-Number(team.id==='home')},(_,index)=>({id:team.members[index]??`${match.rosterId??sportId}.${team.id}.${index}`,side:team.id,index,team,spec:index===(team.keeper??0) && team.keeperSpec ? team.keeperSpec : team.specs[index%team.specs.length]!})));
}

export interface MatchFrame {x:number;y:number;ux:number;uy:number;vx:number;vy:number;length:number;width:number}
export function matchFrame(points:readonly {x:number;y:number}[],targets:readonly {x:number;y:number}[]):MatchFrame{
 const dx=targets[1]!.x-targets[0]!.x,dy=targets[1]!.y-targets[0]!.y,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d,vx=-uy,vy=ux;
 const us=points.map(p=>p.x*ux+p.y*uy),vs=points.map(p=>p.x*vx+p.y*vy),a=(Math.min(...us)+Math.max(...us))/2,b=(Math.min(...vs)+Math.max(...vs))/2;
 return {x:a*ux+b*vx,y:a*uy+b*vy,ux,uy,vx,vy,length:Math.max(...us)-Math.min(...us),width:Math.max(...vs)-Math.min(...vs)};
}
export const matchPoint=(frame:MatchFrame,u:number,v:number)=>({x:frame.x+frame.ux*u+frame.vx*v,y:frame.y+frame.uy*u+frame.vy*v});
export const matchCoordinates=(frame:MatchFrame,p:{x:number;y:number})=>({u:(p.x-frame.x)*frame.ux+(p.y-frame.y)*frame.uy,v:(p.x-frame.x)*frame.vx+(p.y-frame.y)*frame.vy});

/** Distance per gait cycle follows the same planted-foot sweep used by the GPU rig. */
export function matchStride(spec:ObjectDslV2,speed:number){
 const run=Math.max(0,Math.min(1,(speed-22)/30)),root=spec.joints!.find(j=>j.bone==='root')!.position[1];
 return (13.6+14.4*run)/(.62-.2*run)*root/25*measuredScale(spec);
}
