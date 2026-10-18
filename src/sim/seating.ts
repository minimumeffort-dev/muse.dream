import {findSeat,sameSeat,seatAccessClear,worldSeats,type SeatRef,type WorldSeat,SEATING_LIMITS} from '../scene/seating';
import {walkingHeight} from '../scene/interiors';
import type {Scene} from '../scene/schema';
import {carFootprintClear,type CarState,type World} from './car';

export function seatClaimed(state:CarState,ref:SeatRef,exceptAccount?:string):boolean{
 return !!state.economy?.invitation && state.economy.invitation.partner!==exceptAccount && sameSeat(state.economy.invitation.seat,ref) || !!state.economy?.shared && state.economy.shared.phase!=='home' && state.economy.shared.partner!==exceptAccount && sameSeat(state.economy.shared.seat,ref) || sameSeat(state.seated,ref) || !!state.economy?.accounts.some(a=>a.id!==exceptAccount && sameSeat(a.meal?.seat,ref));
}
export function seatAvailable(scene:Scene,state:CarState,seat:WorldSeat,exceptAccount?:string){return !seatClaimed(state,seat,exceptAccount) && seatAccessClear(scene,seat,state.broken);}
function clearApproach(state:CarState,world:World,seat:WorldSeat){
 const distance=Math.hypot(seat.approach.x-state.x,seat.approach.y-state.y),steps=Math.max(1,Math.ceil(distance/2)),body={...world,carRadius:3,bodyHeight:17.5,dryGround:true};let previous=state.elevation;
 for(let i=0;i<=steps;i++){const t=i/steps,x=state.x+(seat.approach.x-state.x)*t,y=state.y+(seat.approach.y-state.y)*t,elevation=walkingHeight(world.scene,x,y,3);if(Math.abs(elevation-previous)>4 || !carFootprintClear(body,x,y,elevation,state.timeS,state))return false;previous=elevation;}
 return true;
}
export function nearbySeat(state:CarState,world:World){
 const scene=world.scene;
 if(state.control.kind!=='foot' || state.seated || !state.grounded || state.surface==='water')return;
 return worldSeats(scene).filter(s=>Math.hypot(s.approach.x-state.x,s.approach.y-state.y)<SEATING_LIMITS.reach && Math.abs(walkingHeight(scene,s.approach.x,s.approach.y)-state.elevation)<4 && seatAvailable(scene,state,s) && clearApproach(state,world,s)).sort((a,b)=>Math.hypot(a.approach.x-state.x,a.approach.y-state.y)-Math.hypot(b.approach.x-state.x,b.approach.y-state.y) || (a.objectId<b.objectId ? -1 : a.objectId>b.objectId ? 1 : a.seatId<b.seatId ? -1 : a.seatId>b.seatId ? 1 : 0))[0];
}
export function seatedPose(state:Pick<CarState,'seated'>,scene:Scene){return findSeat(scene,state.seated);}

export function checkSeatingState(state:CarState,scene:Scene){
 const claims=[state.seated,state.economy?.invitation?.seat,...(state.economy?.shared && state.economy.shared.phase!=='home' ? [state.economy.shared.seat] : []),...(state.economy?.accounts.map(a=>a.meal?.seat)??[])].filter((r):r is SeatRef=>!!r);
 if(claims.some((r,i)=>claims.slice(0,i).some(s=>sameSeat(r,s))))throw Error('Saved seats have duplicate owners');
 if(!state.seated)return;
 const seat=findSeat(scene,state.seated);
 if(!seat || !seatAccessClear(scene,seat,state.broken) || state.control.kind!=='foot' || state.surface==='water' || Math.abs(state.pitch)+Math.abs(state.bank)>.01 || !state.grounded || Math.hypot(state.x-seat.x,state.y-seat.y,state.elevation-seat.elevation)>.01 || Math.abs(state.headingRad-seat.headingRad)>.01 || Math.hypot(state.vx,state.vy,state.vz)>.01)throw Error('Invalid saved player seat');
}
