import {Euler,Quaternion,type Group,Object3D} from 'three';
import {HUMANOID_BONES,type HumanoidBone} from '../scene/humanoid';
import type {ObjectDslV2} from '../scene/object-dsl';

type Rotation=[number,number,number];
type Pose=Record<HumanoidBone,Rotation>;
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const tau=Math.PI*2;
const emptyPose=()=>Object.fromEntries(HUMANOID_BONES.map(b=>[b,[0,0,0]])) as Pose;

/** A planted stance and a lifted return, with a level sole resolved by two-bone IK. */
export function strideFoot(phase:number,run:number):{x:number;y:number;toe:number} {
  const t=((phase%1)+1)%1,stance=mix(.62,.42,run),reach=mix(6.8,11,run);
  if(t<stance){const u=t/stance;return {x:mix(reach,-reach,u),y:0,toe:.16*(1-u)-.38*u**5};}
  const u=(t-stance)/(1-stance),ease=u*u*(3-2*u);
  return {x:mix(-reach,reach,ease),y:Math.sin(Math.PI*u)**1.5*mix(4.5,12,run),toe:mix(-.38,.16,ease)+.12*Math.sin(Math.PI*u)};
}

export function solveLeg(x:number,y:number,upper:number,lower:number):{hip:number;knee:number} {
  const d=clamp(Math.hypot(x,y),Math.abs(upper-lower)+.001,upper+lower-.001);
  return {hip:Math.atan2(x,-y)+Math.acos(clamp((upper*upper+d*d-lower*lower)/(2*upper*d),-1,1)),
    knee:-Math.acos(clamp((d*d-upper*upper-lower*lower)/(2*upper*lower),-1,1))};
}

export interface CharacterInput {
  speed:number;swimming:boolean;grounded:boolean;verticalSpeed:number;time:number;enabled:boolean;
  sport?:{kind:'football'|'basketball';possessed:boolean;charging:boolean;shotAge:number};
  working?:boolean;
  eating?:boolean;
  sittingHeight?:number;
}

/** One cached rig, no mesh traversal, geometry work or physics ownership in the frame loop. */
export class CharacterAnimator {
  private bones:Record<HumanoidBone,{node:Object3D;rest:Quaternion;y:number}>;
  private phase=0;
  private swimPhase=0;
  private moving=0;
  private running=0;
  private water=0;
  private airborne=0;
  private landing=0;
  private previousVertical=0;
  private working=0;
  private eating=0;
  private wasGrounded=true;
  private target=new Quaternion();
  private landRotation=new Quaternion();
  private swimRotation=new Quaternion();
  private angles=new Euler();
  private readonly unit:number;
  constructor(group:Group,spec:ObjectDslV2){
    this.bones=Object.fromEntries(spec.joints!.filter(j=>j.bone).map(j=>{
      const node=group.getObjectByName(j.id)!;
      return [j.bone,{node,rest:node.quaternion.clone(),y:node.position.y}];
    })) as typeof this.bones;
    this.unit=this.bones.root.y/25;
  }

  reset(){
    this.phase=this.swimPhase=this.moving=this.running=this.water=this.airborne=this.landing=this.working=this.eating=0;
    this.wasGrounded=true;this.previousVertical=0;
    for(const {node,rest,y} of Object.values(this.bones)){node.quaternion.copy(rest);node.position.y=y;}
  }

  update(input:CharacterInput,dt:number){
    const step=Math.max(0,Math.min(.1,dt)),active=input.enabled,speed=active ? input.speed : 0;
    const ease=1-Math.exp(-step*12),travel=clamp(speed/25),run=clamp((speed-60)/30);
    const previousMoving=this.moving,previousRunning=this.running,previousAir=this.airborne;
    this.moving=mix(this.moving,travel,ease);this.running=mix(this.running,run,ease);
    this.water=mix(this.water,Number(input.swimming),active ? 1-Math.exp(-step*9) : 1);
    this.airborne=mix(this.airborne,Number(!input.grounded && !input.swimming),ease);
    if(!this.wasGrounded && input.grounded && !input.swimming)this.landing=clamp(-this.previousVertical/120)*1.8;
    this.wasGrounded=input.grounded;this.previousVertical=input.verticalSpeed;
    this.landing*=Math.exp(-step*15);
    if(active){
      this.phase=(this.phase+step*mix(1.65,2.45,(previousRunning+this.running)/2)*clamp(speed/55,.25,1.25)*(previousMoving+this.moving)/2*(1-(previousAir+this.airborne)/2))%1;
      this.swimPhase=(this.swimPhase+step*mix(.55,1.05,clamp(speed/48)))%1;
    }else this.moving=this.running=this.airborne=this.landing=0;
    const moving=this.moving,running=this.running,phase=this.phase,unit=this.unit;
    const land=emptyPose(),swim=emptyPose();
    const bob=mix(.8*(1-Math.cos(phase*tau*2)),2.5*Math.max(0,Math.cos((phase-.45)*tau*2)),running);
    let rootY=this.bones.root.y+unit*(moving*(-1.7+bob)-this.landing);
    land.root=[0,Math.sin(phase*tau)*.055*moving,0];
    land.spine=[0,-Math.sin(phase*tau)*.10*moving,-mix(.035,.19,running)*moving];
    for(const [side,offset,sign] of [['left',0,1],['right',.5,-1]] as const){
      const hip=`${side}_hip` as const,knee=`${side}_knee` as const,ankle=`${side}_ankle` as const;
      const shoulder=`${side}_shoulder` as const,elbow=`${side}_elbow` as const;
      const foot=strideFoot(phase+offset,running),toe=foot.toe*moving;
      const soleLift=Math.max(0,-toe*6.8,toe*2.2);
      const ankleY=this.bones.root.y+this.bones[hip].y+this.bones[knee].y+this.bones[ankle].y;
      const leg=solveLeg(foot.x*unit*moving,(ankleY+unit*(foot.y*moving+soleLift))-rootY-this.bones[hip].y,-this.bones[knee].y,-this.bones[ankle].y);
      land[hip][2]=mix(leg.hip,.35+sign*.12,this.airborne);
      land[knee][2]=mix(leg.knee,-.8-clamp(input.verticalSpeed/140,-.3,.3),this.airborne);
      land[ankle][2]=-land[hip][2]-land[knee][2]+toe;
      land[shoulder]=[-sign*.07,0,mix(-Math.sin((phase+offset)*tau)*mix(.28,.65,running)*moving,-.3,this.airborne)];
      land[elbow][2]=mix(.12+running*.9+Math.max(0,Math.sin((phase+offset)*tau))*.18*moving,.85,this.airborne);
      const stroke=this.swimPhase+offset,angle=stroke*tau;
      const tread=active ? Math.sin(input.time*2.8+offset*tau) : 0;
      const effort=active ? this.moving : 0;
      // Shoulder circles in a vertical plane; the opposite arm recovers with a bent elbow.
      const crawl=Math.atan2(Math.sin(Math.PI-angle),Math.cos(Math.PI-angle));
      const scull=[-sign*(.9+tread*.1),sign*.15,-.25+tread*.12] as Rotation;
      const pull=[-sign*(.15+.2*Math.max(0,-Math.sin(angle))),sign*.08,crawl] as Rotation;
      // Quaternion blending below avoids an angle-wrap snap at the front of a stroke.
      this.landRotation.setFromEuler(this.angles.set(...scull));this.swimRotation.setFromEuler(this.angles.set(...pull));
      this.landRotation.slerp(this.swimRotation,effort);
      const e=this.angles.setFromQuaternion(this.landRotation);swim[shoulder]=[e.x,e.y,e.z];
      swim[elbow][2]=mix(.5,.25+1.15*Math.max(0,-Math.sin(angle)),effort);
      swim[hip][2]=mix(sign*tread*.15,Math.sin(angle*2)*.18,effort);
      swim[knee][2]=mix(-.4,-.15-Math.max(0,-Math.sin(angle*2))*.4,effort);
      swim[ankle][2]=-.18;
    }
    if(input.sittingHeight!==undefined){
      rootY=input.sittingHeight+unit*3;land.root=[0,0,0];land.spine=[0,0,-.04];
      for(const side of ['left','right'] as const){
        const upper=-this.bones[`${side}_knee`].y,lower=-this.bones[`${side}_ankle`].y,leg=solveLeg(upper*.9,unit*3-rootY,upper,lower);
        land[`${side}_hip`][2]=leg.hip;land[`${side}_knee`][2]=leg.knee;land[`${side}_ankle`][2]=-leg.hip-leg.knee;
        land[`${side}_shoulder`][2]=.2;land[`${side}_elbow`][2]=.65;
      }
    }
    const effort=active ? this.moving : 0;
    this.working=active ? mix(this.working,Number(!!input.working && input.grounded && !input.swimming && speed<8),ease) : 0;
    if(this.working>.001)for(const [side,offset] of [['left',0],['right',Math.PI]] as const){
      const pulse=Math.sin(input.time*5+offset);
      land[`${side}_shoulder`][2]=mix(land[`${side}_shoulder`][2],.9+pulse*.07,this.working);
      land[`${side}_elbow`][2]=mix(land[`${side}_elbow`][2],.7-pulse*.12,this.working);
    }
    land.spine[2]=mix(land.spine[2],-.08,this.working);
    this.eating=active ? mix(this.eating,Number(!!input.eating && input.grounded && !input.swimming && speed<1),ease) : 0;
    if(this.eating>.001){const bite=(Math.sin(input.time*2.4)+1)/2;
      land.right_shoulder[2]=mix(land.right_shoulder[2],.6+bite*.28,this.eating);
      land.right_elbow[2]=mix(land.right_elbow[2],1.35+bite*.18,this.eating);
      land.left_shoulder[2]=mix(land.left_shoulder[2],.3,this.eating);land.left_elbow[2]=mix(land.left_elbow[2],.8,this.eating);
    }
    swim.root=[0,Math.sin(this.swimPhase*tau)*.11*effort,-mix(.1,Math.PI/2,effort)];
    swim.spine=[0,0,.27*effort];
    if(input.sport && active){
      const {kind,possessed,charging,shotAge}=input.sport;
      if(kind==='basketball' && (possessed || shotAge<.4)){
        land.left_shoulder[2]=charging || shotAge<.4 ? 2.45 : .35;
        land.right_shoulder[2]=charging || shotAge<.4 ? 2.45 : .25+Math.sin(input.time*9)*.2;
        land.left_elbow[2]=land.right_elbow[2]=charging ? -.9 : shotAge<.4 ? -.15 : .65;
      }
      if(kind==='football' && shotAge<.35){const kick=Math.sin(shotAge/.35*Math.PI);land.left_hip[2]=kick*1.1;land.left_knee[2]=-.2;land.left_ankle[2]=-kick*.5;}
    }
    for(const bone of HUMANOID_BONES){
      const {node,rest}=this.bones[bone];
      this.landRotation.setFromEuler(this.angles.set(...land[bone]));this.swimRotation.setFromEuler(this.angles.set(...swim[bone]));
      this.target.copy(rest).multiply(this.landRotation.slerp(this.swimRotation,this.water));
      if(active && this.water>.001 && this.water<.999)node.quaternion.rotateTowards(this.target,step*12);
      else node.quaternion.copy(this.target);
    }
    const idleBob=active ? Math.sin(input.time*2.8)*.25 : 0;
    this.bones.root.node.position.y=mix(rootY,this.bones.root.y+unit*(effort*8+idleBob),this.water);
  }
}
