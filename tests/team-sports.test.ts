import {it,expect} from 'vitest';
import source from '../docs/examples/team-sports.dream?raw';
import {compileDreamScene,formatDream,checkDream} from '../src/scene/dream';
import {createWorldScene} from '../src/scene/world-fixture';
import {preMatchCompatibilitySource,sha256,BUSINESS_COMPATIBILITY} from '../src/scene/save-compatibility';
import {matchRoster,matchFrame,matchPoint,matchCoordinates} from '../src/scene/sports-match';
import {sportTargets} from '../src/scene/sports';
const compile=(text:string)=>compileDreamScene(text,{sceneId:'teams',revisionId:'r1',sourceHash:'teams-source'});
const scene=compile(source);
it('accepts complete six-a-side courts with reusable varied humanoids and stable NPC identities',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));expect(scene.sports).toHaveLength(2);
 for(const sport of scene.sports){const match=sport.match!,roster=matchRoster(sport.id,match);expect(match.teamSize).toBe(6);expect(roster).toHaveLength(11);expect(roster.filter(m=>m.side==='home')).toHaveLength(5);expect(roster.filter(m=>m.side==='away')).toHaveLength(6);expect(new Set(roster.map(m=>m.id)).size).toBe(11);expect(roster[0]!.spec).not.toBe(roster[1]!.spec);expect(roster.every(m=>m.spec.voxelSize===1)).toBe(true);expect(roster.every(m=>m.spec.parts.every(p=>p.material.shaderStyle!=='cloth'))).toBe(true);const frame=matchFrame(scene.surfaces.find(s=>s.id===sport.surfaceId)!.points,sportTargets(scene,sport));expect(matchCoordinates(frame,matchPoint(frame,20,15))).toEqual({u:20,v:15});}
});
it('rejects incomplete sides, invalid ownership, mechanisms and unbounded team settings',()=>{
 for(const text of [source.replace('role=npc','role=prop'),source.replace('team_size=6','team_size=7'),source.replace('duration_s=180','duration_s=901'),source.replace('skill=.7','skill=1.1'),source.replace('team away','team other'),source.replace('objects=[home_athlete,home_athlete_warm]','object=football')])expect(checkDream(text).ok).toBe(false);
 expect(checkDream(source.replace('objects=[home_athlete,home_athlete_warm]','object=home_athlete,objects=[home_athlete_warm]')).ok).toBe(false);
});
it('counts generated match members inside the existing shared NPC cap',()=>{
 const extras='behavior wait(start=idle){state idle(action=idle){}}\n'+Array.from({length:11},(_,i)=>`place neighbor_${i}(object=home_athlete,at=[700,700],role=npc,behavior=wait);`).join('\n');
 expect(()=>compile(source+extras)).toThrow(/shared 32 NPC budget/);
});
it('can reuse a stationary NPC identity once, while excluding trade, routes and conversation',()=>{
 const extra='behavior wait(start=idle){state idle(action=idle){}}\nplace friend(object=home_athlete,at=[700,700],role=npc,behavior=wait);';
 const reused=compile(source.replace('role=npc,','role=npc,members=[friend],')+extra);expect(matchRoster(reused.sports[0]!.id,reused.sports[0]!.match!)[0]!.id).toBe('friend');
 expect(()=>compile((source.replaceAll('team home(objects=[home_athlete,home_athlete_warm],role=npc,','team home(objects=[home_athlete,home_athlete_warm],role=npc,members=[friend],'))+extra)).toThrow(/only one team/);
 expect(()=>compile(source.replace('role=npc,','role=npc,members=[match_ball],'))).toThrow(/stationary decor person NPC/);
 expect(()=>compile(source.replace('role=npc,','role=npc,members=[player],')+extra.replace('place friend(','place player('))).toThrow(/reserved for the active player/);
});
it('adds unused athlete variants without changing any accepted r66 world field',async()=>{expect(await sha256(preMatchCompatibilitySource(createWorldScene()))).toBe(BUSINESS_COMPATIBILITY);});

import {createCarAtSpawn,resetCar,type CarState,type World,type CarInput} from '../src/sim/car';
import {stepInteractive} from '../src/sim/interaction';
import {stepSports,sportsCourts} from '../src/sim/sports';
import {checkTeams,teamPose} from '../src/sim/team-sports';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(2400,1800),carRadius:11},DT=1/120,idle={steer:0,throttle:0};
function foot(index=0){const court=sportsCourts(scene)[index]!,ball=scene.objects.find(o=>o.id===court.sport.ballId)!;return {...createCarAtSpawn(scene),control:{kind:'foot' as const},x:ball.x-6,y:ball.y,headingRad:0,elevation:0};}
function tick(s:CarState,input:Partial<CarInput>={},steps=1){for(let i=0;i<steps;i++)s=stepInteractive(s,{...idle,...input},DT,world);return s;}
const game=(s:CarState,index=0)=>s.sports[index]!,match=(s:CarState,index=0)=>game(s,index).match!,ball=(s:CarState,index=0)=>s.props.find(p=>p.id===scene.sports[index]!.ballId)!;
it('joins exactly six per side and moves both teams with one ball owner',()=>{
 const start=foot(),snapshot=structuredClone(start),playing=tick(start,{matchPressed:true}),next=tick(playing,{},120);
 expect(start).toEqual(snapshot);expect(match(next).status).toBe('playing');expect(match(next).elapsedS).toBeCloseTo(121*DT);expect(match(next).members.filter((m,i)=>Math.hypot(m.x-match(start).members[i]!.x,m.y-match(start).members[i]!.y)>1).length).toBeGreaterThan(6);expect(match(next).owner).toBe('player');expect(game(next).possessed).toBe(true);expect(ball(next).x).toBeCloseTo(next.x+6);checkTeams(next,scene);
});
it('passes a real moving ball toward a teammate and releases ownership once',()=>{
 let s=tick(foot(),{matchPressed:true});s=tick(s,{},6);expect(match(s).owner).toBe('player');const before=structuredClone(s);s=tick(s,{passPressed:true});expect(match(s).passes).toBe(1);expect(match(s).owner).toBeNull();expect(game(s).possessed).toBe(false);expect(Math.hypot(ball(s).vx,ball(s).vy)).toBeGreaterThan(150);expect(Math.hypot(ball(before).vx,ball(before).vy)).toBe(0);s=tick(s,{},12);expect(match(s).passes).toBe(1);expect(Math.hypot(ball(s).x-before.x,ball(s).y-before.y)).toBeGreaterThan(10);
});
it('charges and shoots on release without a held-key stream of shots',()=>{
 let s=tick(foot(1),{matchPressed:true});s=tick(s,{},6);for(const m of match(s,1).members){m.x=2010;m.y=730;m.fromX=m.x;m.fromY=m.y;}s=tick(s,{shoot:true,shootPressed:true});s=tick(s,{shoot:true},78);expect(game(s,1).shots).toBe(0);s=tick(s,{shoot:false,shootReleased:true});expect(game(s,1).shots).toBe(1);expect(match(s,1).owner).toBeNull();expect(ball(s,1).vz).toBeGreaterThan(100);s=tick(s,{},10);expect(game(s,1).shots).toBe(1);
});
it('calls for a teammate pass and contests a nearby opponent without stealing at a distance',()=>{
 let s=tick(foot(1),{matchPressed:true});const m=match(s,1),home=m.members[1]!,away=m.members[6]!;
 home.x=s.x+30;home.y=s.y;home.fromX=home.x;home.fromY=home.y;m.owner=home.id;m.heldSinceS=m.elapsedS;game(s,1).possessed=false;
 s=tick(s,{passPressed:true});expect(match(s,1).passes).toBe(1);expect(ball(s,1).vx).toBeLessThan(0);
 const opponent=match(s,1).members.find(a=>a.id===away.id)!;opponent.x=s.x+11;opponent.y=s.y;match(s,1).owner=opponent.id;s=tick(s,{passPressed:true});expect(match(s,1).owner).toBe('player');expect(match(s,1).steals).toBeGreaterThan(0);
 match(s,1).members.find(m=>m.id===opponent.id)!.x=s.x+40;match(s,1).owner=opponent.id;game(s,1).possessed=false;s=tick(s,{passPressed:true});expect(match(s,1).owner).not.toBe('player');
});
it('freezes only match play when leaving, releases the ball, and resumes exact scores and time',()=>{
 let s=tick(foot(),{matchPressed:true});s=tick(s,{},30);match(s).home=2;const elapsed=match(s).elapsedS,poses=structuredClone(match(s).members);
 s=tick({...s,x:300,y:300}, {},120);expect(match(s).elapsedS).toBe(elapsed);expect(match(s).members).toEqual(poses);expect(match(s).owner).toBeNull();expect(s.timeS).toBeGreaterThan(1);
 s=tick({...s,x:1000,y:720});expect(match(s).elapsedS).toBeGreaterThan(elapsed);expect(match(s).home).toBe(2);s=tick(s,{matchPressed:true});expect(match(s).status).toBe('resting');const paused=match(s).elapsedS;s=tick(s,{},30);expect(match(s).elapsedS).toBe(paused);s=tick(s,{matchPressed:true});expect(match(s).status).toBe('playing');expect(match(s).home).toBe(2);
});
it('credits real goal crossings to the correct side and ends at the authored score',()=>{
 let s=tick(foot(),{matchPressed:true});const old=structuredClone(s),p=ball(s),prior=ball(old);match(s).owner=null;game(s).possessed=false;match(s).home=4;prior.x=1499;prior.y=720;prior.elevation=0;p.x=1504;p.y=720;p.elevation=0;p.vx=200;
 s=stepSports({...s,timeS:s.timeS+DT},old,idle,DT,world);expect(match(s).home).toBe(5);expect(match(s).away).toBe(0);expect(match(s).status).toBe('finished');expect(game(s).event).toBe('goal');checkTeams(s,scene);
 s=tick(s,{matchPressed:true});expect(match(s).round).toBe(2);expect(match(s).home).toBe(0);expect(match(s).status).toBe('playing');
});
it('ends a tied timed match, preserving the result until a new round',()=>{let s=tick(foot(),{matchPressed:true});match(s).elapsedS=179.99;match(s).tick=Math.floor(179.99/.05);s=tick(s,{},3);expect(match(s).status).toBe('finished');expect(match(s).elapsedS).toBe(180);const score=[match(s).home,match(s).away];s=tick(s,{},120);expect([match(s).home,match(s).away]).toEqual(score);checkTeams(s,scene);});
it('retains match progress on R and deterministically replays transitions',()=>{const a=tick(tick(foot(),{matchPressed:true}),{},240),b=tick(tick(foot(),{matchPressed:true}),{},240);expect(a).toEqual(b);const reset=resetCar(a,scene);expect(match(reset).home).toBe(match(a).home);expect(match(reset).elapsedS).toBe(match(a).elapsedS);expect(match(reset).owner).toBeNull();checkTeams(reset,scene);const m=match(a),p=m.members[0]!,pose=teamPose(m,p);expect(Number.isFinite(pose.x)).toBe(true);});
it('rejects forged owners, rosters, clocks, scores and positions',()=>{const valid=tick(foot(),{matchPressed:true});for(const edit of [(s:CarState)=>{match(s).owner='unknown';},(s:CarState)=>{match(s).tick=999;},(s:CarState)=>{match(s).members[0]!.x=99999;},(s:CarState)=>{match(s).members.pop();},(s:CarState)=>{match(s).home=99;}]){const bad=structuredClone(valid);edit(bad);expect(()=>checkTeams(bad,scene)).toThrow();}});
it('lets bounded opponents and teammates reach actual shots and scores',()=>{
 let s=tick(foot(1),{matchPressed:true});s.x=1755;s.y=610;
 s=tick(s,{},120*40);expect(match(s,1).shots).toBeGreaterThan(0);expect(match(s,1).home+match(s,1).away).toBeGreaterThan(0);expect(match(s,1).members.every(m=>m.x>=1750 && m.x<=2030 && m.y>=600 && m.y<=750)).toBe(true);checkTeams(s,scene);
});

it('lets an opponent win possession and the player tackle it back with one cooldown',()=>{
 let s=tick(foot(),{matchPressed:true});s=tick(s,{},6);const m=match(s);expect(m.owner).toBe('player');
 for(const p of m.members){p.x=s.x+100;p.y=s.y+100;p.fromX=p.x;p.fromY=p.y;}
 const away=m.members[6]!;away.x=s.x+7;away.y=s.y;away.fromX=away.x;away.fromY=away.y;
 m.elapsedS=.699;m.tick=13;m.heldSinceS=0;
 s=tick(s);expect(match(s).owner).toBe(away.id);expect(match(s).members.find(p=>p.id===away.id)!.action).toBe('contest');
 s=tick(s,{passPressed:true});expect(match(s).owner).toBe('player');const steals=match(s).steals;
 match(s).owner=away.id;game(s).possessed=false;s=tick(s,{passPressed:true});expect(match(s).owner).toBe(away.id);expect(match(s).steals).toBe(steals);
});
it('keeps goalkeepers near their goal, catches an incoming ball and passes it out',()=>{
 let s=tick(foot(),{matchPressed:true});s.x=1000;s.y=450;const court=sportsCourts(scene)[0]!,m=match(s),keeper=m.members[0]!;
 m.owner=null;game(s).possessed=false;m.elapsedS=.049;m.tick=0;
 Object.assign(ball(s),{x:keeper.x+4,y:keeper.y,elevation:8,vx:-80,vy:0,vz:0});
 s=tick(s);expect(match(s).owner).toBe(keeper.id);s=tick(s,{},400);
 const frame=matchFrame(court.ground.points,court.targets),pose=matchCoordinates(frame,match(s).members[0]!);
 expect(pose.u).toBeLessThan(-frame.length*.4);expect(match(s).passes).toBeGreaterThan(0);checkTeams(s,scene);
});
it('respects exact pointer aim during a match and keeps keyboard goal assistance',()=>{
 let s=tick(foot(),{matchPressed:true});s=tick(s,{},6);for(const p of match(s).members){p.x=600;p.y=450;p.fromX=p.x;p.fromY=p.y;}
 const initial=structuredClone(s);s=tick(s,{shoot:true,shootPressed:true,aim:{x:s.x,y:1000}});s=tick(s,{shoot:true,aim:{x:s.x,y:1000}},49);s=tick(s,{shootReleased:true,aim:{x:s.x,y:1000}});
 expect(ball(s).vy).toBeGreaterThan(200);expect(Math.abs(ball(s).vx)).toBeLessThan(1);
 let assisted=tick(initial,{shoot:true,shootPressed:true});assisted=tick(assisted,{shoot:true},49);assisted=tick(assisted,{shootReleased:true});expect(ball(assisted).vx).toBeGreaterThan(200);expect(Math.abs(ball(assisted).vy)).toBeLessThan(1);
});
import {containGoalNet} from '../src/sim/sports';
it('contains fast balls at both net sides, sloping roof and floor seam while keeping the mouth open',()=>{
 const court=sportsCourts(scene)[0]!,r=court.radius;
 for(const [i,target] of court.targets.entries()){
  const depth=court.sport.netDepth!*court.targetScales[i]!,height=target.height,floor=target.elevation-height/2,normal=Math.hypot(1/depth,1/height);
  const prop=(n:number,t:number,z:number)=>({id:'test',x:target.x+target.nx*n+target.tx*t,y:target.y+target.ny*n+target.ty*t,elevation:floor+z-r,vx:target.nx*600+target.tx*300,vy:target.ny*600+target.ty*300,vz:400});
  for(const [n,t,z] of [[depth*2,0,r],[4,target.width,3],[4,-target.width,3],[4,0,height*2]]){
   const old=prop(3,0,3),next=prop(n!,t!,z!);containGoalNet(next,old,court,DT);
   const along=(next.x-target.x)*target.nx+(next.y-target.y)*target.ny,across=(next.x-target.x)*target.tx+(next.y-target.y)*target.ty,centre=next.elevation+r-floor;
   expect(Math.abs(across)).toBeLessThanOrEqual(target.width/2-r+.0001);expect(centre).toBeGreaterThanOrEqual(r-.0001);expect(along/depth+centre/height+r*normal).toBeLessThanOrEqual(1.0001);
  }
  const old=prop(3,0,3),out=prop(-5,0,3),snapshot=structuredClone(out);containGoalNet(out,old,court,DT);expect(out).toEqual(snapshot);
 }
});

import {sportCameraFrame} from '../src/game/camera';
it('widens team framing around passing play and long free balls without rotating it',()=>{
 const player={x:1000,y:720},near={x:1006,y:720},goal={x:1500,y:720},close=sportCameraFrame(player,near,'football',goal,true),far=sportCameraFrame(player,{x:1450,y:720},'football',goal,true);
 expect(close.zoom).toBe(1.6);expect(close.zoom).toBeLessThan(sportCameraFrame(player,near,'football',goal).zoom);expect(far.zoom).toBeLessThan(close.zoom);expect(far.zoom).toBeGreaterThanOrEqual(.85);expect(close.y).toBe(720);expect(far.x).toBeGreaterThan(close.x);
});
it('keeps an athlete clear of a post using its measured body rather than a fixed walking radius',()=>{
 for(const [gap,blocked] of [[8.6,true],[10.6,false]] as const){
  const doc=compile(source+`\nobject post(label="Training post"){measure(kind=custom,axis=y,meters=.4);body(interaction=solid,radius=5,height=4);part pole(shape=cylinder,material=steel,at=[0,2,0],size=[10,4,10]);}place side_post(object=post,at=[883,${720+gap}]);`),w={...world,scene:doc},start=foot();let s=stepInteractive(start,{...idle,matchPressed:true},DT,w);
  for(let i=0;i<11;i++)s=stepInteractive(s,idle,DT,w);const member=match(s).members[1]!;
  if(blocked)expect(member.x).toBe(880);else expect(member.x).toBeGreaterThan(881);
 }
});
