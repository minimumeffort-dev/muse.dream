import {it,expect} from 'vitest';
import source from '../docs/examples/team-sports.dream?raw';
import {compileDreamScene} from '../src/scene/dream';
import {createCarAtSpawn,FixedStepper} from '../src/sim/car';
import {presentState} from '../src/game/presentation';
import {teamPose} from '../src/sim/team-sports';
const scene=compileDreamScene(source,{sceneId:'presentation',revisionId:'r1',sourceHash:'test'});

it('presents uniform motion without repeated tick poses at 30, 60 and 144 Hz, leaving physics untouched',()=>{
 for(const fps of [30,60,144]){
  const stepper=new FixedStepper();let current={...createCarAtSpawn(scene),x:200,y:300,vx:100,vy:0},previous=current;
  for(let frame=1;frame<=fps;frame++){
   for(let i=0,n=stepper.push(1/fps);i<n;i++){previous=current;current={...current,x:current.x+100*stepper.stepDt,timeS:current.timeS+stepper.stepDt};}
   const copy=structuredClone(current),visible=presentState(previous,current,stepper.alpha,scene);
   expect(visible.x).toBeCloseTo(200+100*Math.max(0,frame/fps-stepper.stepDt),7);expect(current).toEqual(copy);
  }
  expect(current.timeS).toBeCloseTo(1);expect(stepper.stepsRun).toBe(120);
 }
});

it('takes the short heading arc and snaps resets, ownership changes and discontinuous clocks',()=>{
 const before={...createCarAtSpawn(scene),headingRad:Math.PI-.02},after={...before,x:before.x+1,timeS:1/120,headingRad:-Math.PI+.02};
 expect(presentState(before,after,.5,scene).headingRad).toBeCloseTo(Math.PI);
 for(const changed of [{...after,x:3000},{...after,control:{kind:'foot' as const}},{...after,timeS:1}])expect(presentState(before,changed,0,scene).x).toBe(changed.x);
 expect(presentState({...before,seated:{objectId:'bench',seatId:'left'}},{...after,seated:{objectId:'bench',seatId:'right'}},0,scene).x).toBe(after.x);
});

it('keeps a carried NPC ball with its interpolated owner, including a 20 Hz boundary and release',()=>{
 const previous=createCarAtSpawn(scene),current=structuredClone(previous),before=previous.sports[0]!.match!,after=current.sports[0]!.match!,member=after.members[0]!,ballId=scene.sports[0]!.ballId;
 previous.timeS=.05-1/120;current.timeS=.05;
 before.status=after.status='playing';before.owner=after.owner=member.id;
 before.elapsedS=previous.timeS;after.elapsedS=current.timeS;before.tick=0;after.tick=1;
 Object.assign(before.members[0]!,{fromX:500,x:503,fromY:500,y:500,fromHeading:0,heading:0});
 Object.assign(member,{fromX:503,x:506,fromY:500,y:500,fromHeading:0,heading:0});
 for(const alpha of [0,.2,.5,.9,1]){
  const visible=presentState(previous,current,alpha,scene),match=visible.sports[0]!.match!,pose=teamPose(match,match.members[0]!),ball=visible.props.find(p=>p.id===ballId)!;
  expect(ball.x-pose.x).toBeCloseTo(6);expect(ball.y).toBeCloseTo(pose.y);
  expect(pose.x).toBeCloseTo(502.5+.5*alpha);
 }
 after.owner=null;const ball=current.props.find(p=>p.id===ballId)!;ball.x=510;ball.y=500;
 expect(presentState(previous,current,0,scene).props.find(p=>p.id===ballId)!.x).toBeCloseTo(508.5);
});
