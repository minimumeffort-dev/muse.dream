import {it,expect} from 'vitest';
import {Box3,Vector3,Ray} from 'three';
import {ASSETS} from '../src/assets';
import {scenePlan,agentPose,episodePoint,scenarioPoints} from '../src/scene-plan';
import {buildFromBrief,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS,SCENARIO_BRIEFS} from '../src/framework';
import {ExperimentRun} from '../src/runner';
import {buildCustom} from '../src/engine/game/world3d';
import {compactObject} from '../src/engine/game/compact-object';
import {CharacterAnimator} from '../src/engine/game/character-animation';
import {measuredScale} from '../src/engine/scene/measure';
import {HUMANOID_BONES} from '../src/engine/scene/humanoid';

const build=()=>buildFromBrief(DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS);
it('ports a bounded Dream asset pack through the existing geometry builder and complete humanoid bindings',()=>{
  expect(Object.keys(ASSETS)).toHaveLength(17);
  for(const [id,spec] of Object.entries(ASSETS)){
    const group=compactObject(buildCustom({id,kind:'custom',labelText:spec.displayName,x:0,y:0,scale:measuredScale(spec),spec}));
    const box=new Box3().setFromObject(group),size=box.getSize(new Vector3());
    expect([size.x,size.y,size.z].every(n=>n>0&&Number.isFinite(n))).toBe(true);
    if(spec.measure?.kind==='person'){
      expect(spec.joints!.map(j=>j.bone).sort()).toEqual([...HUMANOID_BONES].sort());
      const animator=new CharacterAnimator(group,spec);
      for(let frame=0;frame<30;frame++)animator.update({speed:30,grounded:true,swimming:false,verticalSpeed:0,time:frame/30,enabled:true,travel:{x:frame,z:0,heading:0},ground:()=>({height:0,slopeX:0,slopeZ:0})},1/30);
      expect(new Box3().setFromObject(group).isEmpty()).toBe(false);
      animator.reset();
    }
  }
});
it('uses only accepted links and attaches every authored building entrance to its connected apron',()=>{
 for(const brief of SCENARIO_BRIEFS){
  const {scenario}=buildFromBrief(brief.world,brief.task,DEFAULT_PARAMETERS),before=structuredClone(scenario),plan=scenePlan(scenario);
  expect(plan.links.map(l=>l.id)).toEqual(scenario.links.map(l=>l.id));
  expect(plan.locations.filter(l=>l.asset)).toHaveLength(3);
  for(const location of plan.locations.filter(l=>l.asset)){
    const c=Math.cos(location.yaw),s=Math.sin(location.yaw),entry=location.entry;
    const group=buildCustom({id:location.id,kind:'custom',labelText:location.label,x:0,y:0,scale:location.scale,spec:ASSETS[location.asset!]});
    const z=entry.z,x=entry.x;
    expect(location.position.x+x*c+z*s).toBeCloseTo(location.door.x);
    expect(location.position.z-x*s+z*c).toBeCloseTo(location.door.z);
    expect(Math.hypot(location.point.x-location.door.x,location.point.z-location.door.z)).toBeCloseTo(24);
    const footprint=new Box3().setFromObject(group).expandByScalar(8);footprint.min.y=-1;footprint.max.y=30;
    const local=(p:{x:number;z:number})=>new Vector3(p.x-location.position.x,10,p.z-location.position.z).applyAxisAngle(new Vector3(0,1,0),-location.yaw);
    for(const link of plan.links){
      const start=local(link.a),end=local(link.b),delta=end.clone().sub(start),hit=new Ray(start,delta.clone().normalize()).intersectBox(footprint,new Vector3());
      expect(hit===null||start.distanceTo(hit)>delta.length(),`${location.id} intrudes on ${link.id}`).toBe(true);
    }
  }
  expect(scenario).toEqual(before);
 }
});
it('derives travel, cargo and service poses from recorded state without changing it or its outcome',async()=>{
  const run=await ExperimentRun.create(build().source),points=scenarioPoints(run.scenario),initial=structuredClone(run.at(0));
  run.advance();expect(agentPose(run.scenario,run.at(1),0,points).cargo).toEqual(['bread']);
  run.advance();const moving=run.at(2).agents[0]!;
  expect(moving.work?.kind).toBe('move');expect(episodePoint(moving,points)).not.toEqual(points.get(moving.at));
  let worked=false,carriedKit=false;
  do{const state=run.at(run.length),snapshot=structuredClone(state);for(let i=0;i<state.agents.length;i++){
    const pose=agentPose(run.scenario,state,i,points);worked||=pose.working;carriedKit||=pose.cargo.includes('kit');
    expect(Number.isFinite(pose.x+pose.z+pose.heading)).toBe(true);
  }expect(state).toEqual(snapshot);}while(run.advance());
  expect(worked&&carriedKit).toBe(true);expect(run.at(0)).toEqual(initial);
  expect(run.metrics()).toMatchObject({completed:4,steps:27,creditsSpent:16,violations:0});
  expect(agentPose(run.scenario,run.at(27),0,points).cargo).toEqual([]);
});
