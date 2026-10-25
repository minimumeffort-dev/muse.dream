import type {CarState,World} from '../sim/car';
import {carFootprintClear} from '../sim/car';
import {bodyWorld,toggleRide,FOOT_RADIUS,FOOT_HEIGHT} from '../sim/interaction';
import {walkingHeight} from '../scene/interiors';
import {repairArea} from '../sim/repair';
import {workPath} from '../sim/work-navigation';

/** Only the review's starting pose is seeded; crossing uses ordinary foot controls. */
export function crossingReviewStart(state:CarState,world:World):CarState{
 const foot=state.control.kind==='foot' ? state : toggleRide(state,world),x=11118,y=5126;
 if(foot.control.kind!=='foot')throw Error('Crossing review needs a dry vehicle exit');
 const next={...foot,x,y,elevation:walkingHeight(world.scene,x,y),headingRad:0,vx:0,vy:0,vz:0,grounded:true};
 if(!carFootprintClear(bodyWorld(next,world),x,y,next.elevation,next.timeS,next))throw Error('Crossing review start is obstructed');
 return next;
}
export function crossingReviewPath(state:CarState,world:World){
 const service=world.scene.economy!.repairs.find(r=>r.id==='classroom_furniture')!,area={...repairArea(world.scene,service),id:'review/foot/medical-crossing',radius:FOOT_RADIUS,height:FOOT_HEIGHT};
 const path=workPath(world.scene,area,state,{x:11282,y:5126},state);
 if(!path || path.length!==1)throw Error('Crossing review needs the direct body-clear crossing');
 return path;
}
