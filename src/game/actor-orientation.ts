import {Euler,Quaternion,Vector3} from 'three';
import type {Scene} from '../scene/schema';
import type {ActorPose} from '../sim/actors';
import {terrainNormal} from './environment';

/** Walking articulation fits the ground per foot; vehicles follow its normal. */
export function actorOrientation(scene:Scene,pose:Pick<ActorPose,'x'|'y'|'kind'|'headingRad'|'activity'|'bank'|'pitch'>,humanoid:boolean,surfaceGrounded=false):Quaternion {
 const upright=humanoid || pose.activity && !surfaceGrounded;
 const normal=!upright && (pose.kind==='rail' || pose.kind==='path') ? terrainNormal(scene,pose.x,pose.y) : new Vector3(0,1,0);
 return new Quaternion().setFromUnitVectors(new Vector3(0,1,0),normal)
  .multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),-pose.headingRad))
  .multiply(new Quaternion().setFromEuler(new Euler(pose.bank??0,0,pose.pitch??0)));
}
