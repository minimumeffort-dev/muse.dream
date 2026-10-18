import {Euler,Quaternion,Vector3,type Group,Object3D} from 'three';
import {HUMANOID_BONES,type HumanoidBone} from '../scene/humanoid';
import type {ObjectDslV2} from '../scene/object-dsl';
import {FootPlants,gaitRun,gaitStance,gaitStride,gaitPlantReach,humanoidFeet,soleSupport,strideFoot,type Sole,type TravelPose,type GroundSampler} from './humanoid-gait';
export {strideFoot} from './humanoid-gait';

type Rotation=[number,number,number];
type Pose=Record<HumanoidBone,Rotation>;
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const tau=Math.PI*2;
const emptyPose=()=>Object.fromEntries(HUMANOID_BONES.map(b=>[b,[0,0,0]])) as Pose;

export function solveLeg(x:number,y:number,upper:number,lower:number):{hip:number;knee:number} {
  const d=clamp(Math.hypot(x,y),Math.abs(upper-lower)+.001,upper+lower-.001);
  return {hip:Math.atan2(x,-y)+Math.acos(clamp((upper*upper+d*d-lower*lower)/(2*upper*d),-1,1)),
    knee:-Math.acos(clamp((d*d-upper*upper-lower*lower)/(2*upper*lower),-1,1))};
}

export interface CharacterInput {
  speed:number;swimming:boolean;grounded:boolean;verticalSpeed:number;time:number;enabled:boolean;
  travel?:TravelPose;
  ground?:GroundSampler;
  sport?:{kind:'football'|'basketball';possessed:boolean;charging:boolean;shotAge:number;action?:{kind:'kick'|'throw'|'contest';age:number}};
  working?:boolean;
  eating?:boolean;
  sittingHeight?:number;
}

/** One cached rig, no mesh traversal, geometry work or physics ownership in the frame loop. */
export class CharacterAnimator {
  private bones:Record<HumanoidBone,{node:Object3D;rest:Quaternion;y:number}>;
  private phase=gaitStance(0)/2;
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
  private readonly soles:[Sole,Sole];
  private readonly soleRadius:number;
  private plants=new FootPlants();
  private travel:TravelPose|undefined;
  private surfaceOffset=0;
  private ankles=[new Quaternion(),new Quaternion()];
  private up=new Vector3(0,1,0);
  private normal=new Vector3();
  constructor(private group:Group,spec:ObjectDslV2){
    this.bones=Object.fromEntries(spec.joints!.filter(j=>j.bone).map(j=>{
      const node=group.getObjectByName(j.id)!;
      return [j.bone,{node,rest:node.quaternion.clone(),y:node.position.y}];
    })) as typeof this.bones;
    const feet=humanoidFeet(spec);this.unit=this.bones.root.y/25;this.soles=feet.map(f=>f.sole) as [Sole,Sole];this.soleRadius=Math.max(...feet.map(f=>f.radius));
  }

  reset(){
    this.phase=gaitStance(0)/2;this.swimPhase=this.moving=this.running=this.water=this.airborne=this.landing=this.working=this.eating=0;
    this.wasGrounded=true;this.previousVertical=0;
    this.plants.reset();this.travel=undefined;this.surfaceOffset=0;
    for(const {node,rest,y} of Object.values(this.bones)){node.quaternion.copy(rest);node.position.y=y;}
  }

  update(input:CharacterInput,dt:number){
    const step=Math.max(0,Math.min(.1,dt)),active=input.enabled;
    const contact=active && input.travel && input.grounded && !input.swimming && input.sittingHeight===undefined ? input.travel : undefined;
    const distance=contact && this.travel ? Math.hypot(contact.x-this.travel.x,contact.z-this.travel.z) : 0;
    const continuous=Math.hypot(distance,(contact?.y??0)-(this.travel?.y??0))<this.group.scale.x*this.unit*80;
    const speed=active ? contact ? this.travel && step>0 && continuous ? distance/step : 0 : input.speed : 0;
    if(contact && (!this.travel || !continuous))this.phase=gaitStance(0)/2;
    if(!contact || !continuous)this.plants.reset();
    if(contact)this.plants.begin(contact,this.group.scale.x*this.unit,step,input.ground,this.soleRadius*this.group.scale.x);
    const ease=1-Math.exp(-step*12),travel=input.swimming ? clamp(speed/25) : Number(speed>.01),run=gaitRun(speed);
    const previousRunning=this.running,previousAir=this.airborne;
    this.moving=mix(this.moving,travel,ease);this.running=mix(this.running,run,ease);
    this.water=mix(this.water,Number(input.swimming),active ? 1-Math.exp(-step*9) : 1);
    this.airborne=mix(this.airborne,Number(!input.grounded && !input.swimming),ease);
    if(!this.wasGrounded && input.grounded && !input.swimming)this.landing=clamp(-this.previousVertical/120)*1.8;
    this.wasGrounded=input.grounded;this.previousVertical=input.verticalSpeed;
    this.landing*=Math.exp(-step*15);
    if(active){
      const travelled=contact ? continuous ? distance : 0 : step*speed*(1-(previousAir+this.airborne)/2);
      this.phase+=travelled/(this.group.scale.x*this.unit*gaitStride((previousRunning+this.running)/2));
      this.swimPhase=(this.swimPhase+step*mix(.55,1.05,clamp(speed/48)))%1;
    }else this.moving=this.running=this.airborne=this.landing=0;
    this.travel=contact ? {...contact} : undefined;
    const moving=this.moving,running=this.running,phase=this.phase,unit=this.unit;
    if(!active && input.travel && input.ground && input.grounded && !input.swimming && input.sittingHeight===undefined)this.surfaceOffset=(input.ground(input.travel.x,input.travel.z,input.travel.y??0,this.soleRadius*this.group.scale.x).height-(input.travel.y??0))/this.group.scale.x;
    const land=emptyPose(),swim=emptyPose();
    const bob=mix(.8,1.2,running)*(1-Math.cos(phase*tau*2));
    let rootY=this.bones.root.y+unit*(moving*(-mix(1.7,5.5,running)+bob)-this.landing);
    land.root=[0,0,0];
    const feet=([['left',0],['right',.5]] as const).map(([side,offset],i)=>{
      const foot=strideFoot(phase+offset,running);
      const hip=this.bones[`${side}_hip`],upper=-this.bones[`${side}_knee`].y,lower=-this.bones[`${side}_ankle`].y;
      const ankleY=this.bones.root.y+hip.y-upper-lower;
      const plant=contact ? this.plants.sample(i,contact,this.group.scale.x,foot.x*unit*moving,hip.node.position.z,foot.y===0 || moving<.001,Math.floor(phase+offset),unit,gaitPlantReach(upper,lower)) : undefined;
      const toe=plant?.lift ? -.08 : contact && moving<.001 ? 0 : foot.toe*moving;
      const x=plant?.x??foot.x*unit*moving,z=(plant?.z??hip.node.position.z)-hip.node.position.z,y=ankleY+unit*foot.y*moving+(plant?.lift??0)+(plant?.rise??this.surfaceOffset)+Math.max(0,soleSupport(this.soles[i]!,toe)/(plant?.normalY??1)-ankleY);
      return {x,y,z,toe,yaw:plant?.yaw??0,slopeX:plant?.slopeX??0,slopeZ:plant?.slopeZ??0,originRise:plant?.originRise??this.surfaceOffset,surfaceOffset:plant?.surfaceOffset??this.surfaceOffset,limit:y+Math.sqrt(Math.max(0,(upper+lower-.001)**2-x*x-z*z))-hip.y};
    });
    if(contact)this.surfaceOffset=Math.max(feet[0]!.surfaceOffset,feet[1]!.surfaceOffset);
    rootY+=Math.max(feet[0]!.originRise,feet[1]!.originRise);
    // Fit both contacts before IK; clamping an unreachable ankle makes the foot skate.
    if(moving>.001 || contact)rootY=Math.min(rootY,feet[0]!.limit,feet[1]!.limit);
    land.spine=[0,-Math.sin(phase*tau)*.10*moving,-mix(.035,.19,running)*moving];
    for(const [side,offset,sign,index] of [['left',0,1,0],['right',.5,-1,1]] as const){
      const hip=`${side}_hip` as const,knee=`${side}_knee` as const,ankle=`${side}_ankle` as const;
      const shoulder=`${side}_shoulder` as const,elbow=`${side}_elbow` as const;
      const foot=feet[index]!,toe=foot.toe;
      const vertical=foot.y-rootY-this.bones[hip].y,roll=Math.atan2(-foot.z,-vertical);
      const leg=solveLeg(foot.x,-Math.hypot(vertical,foot.z),-this.bones[knee].y,-this.bones[ankle].y);
      land[hip][0]=roll;
      land[hip][2]=mix(leg.hip,.35+sign*.12,this.airborne);
      land[knee][2]=mix(leg.knee,-.8-clamp(input.verticalSpeed/140,-.3,.3),this.airborne);
      land[ankle][2]=-land[hip][2]-land[knee][2]+toe;
      this.ankles[index]!.setFromEuler(this.angles.set(roll,0,land[hip][2]+land[knee][2])).invert()
        .multiply(this.target.setFromUnitVectors(this.up,this.normal.set(-foot.slopeX,1,-foot.slopeZ).normalize())).multiply(this.target.setFromEuler(this.angles.set(0,foot.yaw,0))).multiply(this.target.setFromEuler(this.angles.set(0,0,toe)));
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
      const action=input.sport.action;if(action && action.age>=0 && action.age<.45){const effort=Math.sin(action.age/.45*Math.PI);
        if(action.kind==='contest'){land.right_hip[2]=effort*.8;land.left_hip[2]=-effort*.3;land.spine[2]=-effort*.3;}
        if(action.kind==='kick'){land.right_hip[2]=effort*1.05;land.right_knee[2]=-effort*.45;}
        if(action.kind==='throw'){land.left_shoulder[2]=land.right_shoulder[2]=effort*1.7;land.left_elbow[2]=land.right_elbow[2]=-effort*.65;}
      }
      if(kind==='football' && shotAge<.35){const kick=Math.sin(shotAge/.35*Math.PI);land.left_hip[2]=kick*1.1;land.left_knee[2]=-.2;land.left_ankle[2]=-kick*.5;}
    }
    for(const bone of HUMANOID_BONES){
      const {node,rest}=this.bones[bone];
      if(contact && bone.endsWith('_ankle'))this.landRotation.copy(this.ankles[bone.startsWith('left') ? 0 : 1]!);
      else this.landRotation.setFromEuler(this.angles.set(...land[bone]));
      this.swimRotation.setFromEuler(this.angles.set(...swim[bone]));
      this.target.copy(rest).multiply(this.landRotation.slerp(this.swimRotation,this.water));
      if(active && this.water>.001 && this.water<.999)node.quaternion.rotateTowards(this.target,step*12);
      else node.quaternion.copy(this.target);
    }
    const idleBob=active ? Math.sin(input.time*2.8)*.25 : 0;
    this.bones.root.node.position.y=mix(rootY,this.bones.root.y+unit*(effort*8+idleBob),this.water);
  }
}
