import {it,expect} from 'vitest';
import {repairView} from '../src/game/repair-view';
import type {ActorPose} from '../src/sim/actors';
const pose=(x:number,headingRad=0):ActorPose=>({id:'worker',x,y:0,elevation:0,headingRad,kind:'path',speed:14,distance:x,travelled:x,vx:14,vy:0});
it('renders quarter-second walking updates as continuous bounded motion at 30 rendered fps',()=>{
 const view=repairView();let previous=0;
 for(let i=0;i<=30;i++){const now=i/30,tick=Math.floor((now+1e-8)/.25)*.25,p=Object.freeze(pose(tick*14)),rendered=view.sample(p,true,tick,now);expect(rendered.x-previous).toBeGreaterThanOrEqual(-1e-8);expect(rendered.x-previous).toBeLessThanOrEqual(14/30+1e-6);expect(p.x-rendered.x).toBeLessThanOrEqual(3.501);previous=rendered.x;}
 expect(previous).toBeGreaterThan(10);expect(view.resident).toBe(1);
});
it('keeps the same visual clock when player transactions insert irregular commerce updates',()=>{
 for(const fps of [30,60,144]){
  const view=repairView(),ticks=[0,.25,.3,.375,.55,.8,.825,.9,1.15,1.4];let index=0;
  for(let frame=0;frame<=fps*1.4;frame++){
   const now=frame/fps;while(index+1<ticks.length && ticks[index+1]!<=now+1e-8)index++;
   const tick=ticks[index]!,p=Object.freeze(pose(tick*14)),visible=view.sample(p,true,tick,now);
   expect(visible.x,`${fps} Hz at ${now}`).toBeCloseTo(14*Math.max(0,now-.25),6);
   expect(p.x).toBe(tick*14);
  }
 }
});
it('takes the short turn across pi, freezes with the simulation clock and snaps on recovery/reduced motion',()=>{
 const view=repairView();view.sample(pose(0,3.13),true,0,0);const p=view.sample(pose(3.5,-3.13),true,.25,.375);expect(Math.abs(p.headingRad)).toBeGreaterThan(3);expect(view.sample(pose(3.5,-3.13),true,.25,.375)).toEqual(p);const snapped=pose(500);expect(view.sample(snapped,true,.25,.375,true)).toBe(snapped);expect(view.resident).toBe(0);
});
it('preserves every unrelated pose and releases finished maintenance without retaining view state',()=>{
 const view=repairView(),other=pose(0);expect(view.sample(other,false,0,0)).toBe(other);view.sample(pose(0),true,0,0);view.sample(pose(3.5),true,.25,.25);const home={...pose(7),distance:0,travelled:0,speed:0};const ending=view.sample(home,false,.5,.6);expect(ending.travelled).toBeGreaterThanOrEqual(3.5);expect(view.sample(home,false,.75,.75)).toBe(home);expect(view.resident).toBe(0);view.sample(pose(0),true,1,1);view.reset();expect(view.resident).toBe(0);
});
it('finishes the visible stride before resting and keeps the limb clock continuous between commerce ticks',()=>{
 const view=repairView();view.sample(pose(0),true,0,0);
 const end={...pose(3.5),speed:0,animationTimeS:.25};view.sample(end,true,.25,.25);
 const midway=view.sample({...end,animationTimeS:.375},true,.25,.375);
 expect(midway.x).toBeCloseTo(1.75);expect(midway.speed).toBeCloseTo(14);expect(midway.animationTimeS).toBe(.375);
 view.sample({...end,animationTimeS:.5},true,.5,.5);
 expect(view.sample({...end,animationTimeS:.6},true,.5,.6).speed).toBe(0);
});
it('hands a worker back to a walking route without snapping and releases it at the next stop',()=>{
 const view=repairView();let previous=0;
 for(let frame=0;frame<=120;frame++){
  const now=frame/60,tick=Math.floor((now+1e-8)/.25)*.25,active=now<.5;
  const p=active ? pose(tick*14) : {...pose(14*Math.min(now,1)),speed:now<1 ? 14 : 0,distance:14*Math.max(0,now-.5)};
  const visible=view.sample(p,active,tick,now);
  expect(visible.x-previous).toBeGreaterThanOrEqual(-1e-8);expect(visible.x-previous).toBeLessThanOrEqual(14/60+1e-6);previous=visible.x;
 }
 expect(previous).toBe(14);expect(view.resident).toBe(0);
});
it('bounds its samples across rapid actions and handles reactivation, teleports and clock rewinds',()=>{
 const view=repairView();
 for(let frame=0;frame<1200;frame++){
  const now=frame/120,active=frame%90!==40,visible=view.sample(pose(now*14),active,now,now);
  expect(visible.x).toBeCloseTo(14*Math.max(0,now-.25));expect(view.buffered).toBeLessThanOrEqual(64);
 }
 const warp=pose(500);expect(view.sample(warp,true,10,10)).toBe(warp);expect(view.resident).toBe(0);
 view.sample(pose(0),true,12,12);expect(view.sample(pose(0),true,0,0).x).toBe(0);expect(view.resident).toBe(0);
});
