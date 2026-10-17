import {it,expect} from 'vitest';
import {compileDream} from '../src/scene/dream';
import {parseScene,type Scene,type SceneObject} from '../src/scene/schema';
import {createFixtureScene} from '../src/scene/fixture';
import {objectContacts} from '../src/scene/contacts';
import {contactSeparation} from '../src/scene/contact-geometry';
import {createCarAtSpawn,carFootprintClear,type CarState,type World} from '../src/sim/car';
import {bodyWorld,exitPosition,toggleRide,stepInteractive,FOOT_RADIUS} from '../src/sim/interaction';
import {buildPaperMask} from '../src/sim/mask';
import {actorPose} from '../src/sim/actors';

const carriage=compileDream(`dream 2;material green(style=toon,colors=[#568577,#385b50]);object carriage(label="Passenger carriage"){
 body(interaction=solid,radius=15,height=17);rideable(at=[0,8.7,0]);
 ${Array.from({length:8},(_,i)=>`contact shell_${i}(at=[${-33.5+i*67/7},0,0],radius=7,height=17);`).join('\n')}
 part shell(shape=box,material=green,at=[0,7.5,0],size=[80,15,12]);}`)[0]!;
const obstacle=compileDream('dream 2;material gray(style=toon,colors=[#888888,#666666]);object obstacle(label="Obstacle"){body(interaction=solid,radius=12,height=40);part block(shape=box,material=gray,at=[0,20,0],size=[24,40,24]);}')[0]!;
const enclosure=compileDream('dream 2;material gray(style=toon,colors=[#888888,#666666]);object enclosure(label="Enclosure"){measure(kind=custom,axis=x,meters=51.2);body(interaction=solid,radius=30,height=40);contact shell(at=[0,0,0],radius=64,height=40);part block(shape=cylinder,material=gray,at=[0,20,0],size=[128,40,128]);}')[0]!;
function fixture(scale=2,headingRad=0,extra:SceneObject[]=[]){
 const scene=parseScene({...createFixtureScene(),terrain:{hills:[]},regions:[],routes:[{id:'line',kind:'tram',mode:'shuttle',speed:20,points:[{x:480,y:360},{x:480+200*Math.cos(headingRad),y:360+200*Math.sin(headingRad)}]}],objects:[{id:'carriage',kind:'custom',role:'npc',labelText:'Passenger carriage',x:480,y:360,scale,headingRad,spec:carriage,route:{id:'line',offset:0}},...extra]});
 const world:World={scene,roadMask:buildPaperMask(960,720),driveMask:buildPaperMask(960,720),carRadius:11},object=scene.objects[0]!,pose=actorPose(scene,object,0);
 const state:CarState={...createCarAtSpawn(scene),...pose,control:{kind:'passenger',id:object.id},vehicles:[{id:null,x:200,y:200,elevation:0,headingRad:.3,distance:90}]};
 return {world,state,object};
}
function gap(scene:Scene,state:CarState,foot:CarState){const object=scene.objects[0]!;return Math.min(...objectContacts(scene,object,{x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad}).map(c=>contactSeparation(c,foot.x,foot.y).distance));}

it.each([0,Math.PI/3,-Math.PI/2])('exits beside a scaled compound passenger body at heading %s and can board again',heading=>{
 for(const scale of [.7,1,2]){
  const {world,state}=fixture(scale,heading),foot=toggleRide(state,world);
  expect(foot.control.kind).toBe('foot');expect(gap(world.scene,state,foot)).toBeCloseTo(FOOT_RADIUS+5,6);
  expect(carFootprintClear({...bodyWorld(foot,world),dryGround:true},foot.x,foot.y,foot.elevation,foot.timeS,foot)).toBe(true);
  expect(foot.vehicles).toEqual(state.vehicles);expect(toggleRide(foot,world).control).toEqual(state.control);
 }
});

it('finds another clear side when its preferred side is blocked and refuses a fully enclosed exit',()=>{
 const blocked={id:'blocker',kind:'custom' as const,role:'prop' as const,labelText:'Blocker',x:480,y:385,scale:1,spec:obstacle},one=fixture(2,0,[blocked]),foot=toggleRide(one.state,one.world);
 expect(foot.control.kind).toBe('foot');expect(Math.abs(foot.x-one.state.x)).toBeGreaterThan(1);
 expect(carFootprintClear({...bodyWorld(foot,one.world),dryGround:true},foot.x,foot.y,foot.elevation,0,foot)).toBe(true);
 const enclosed=fixture(2,0,[{...blocked,x:480,y:360,scale:4,spec:enclosure}]);expect(exitPosition(enclosed.state,enclosed.world)).toBeUndefined();expect(toggleRide(enclosed.state,enclosed.world)).toBe(enclosed.state);
});

it('keeps passenger ownership and the original parked car while the route resumes after boarding',()=>{
 const {world,state}=fixture(),route={id:'line',kind:'tram' as const,mode:'shuttle' as const,speed:20,waitS:0,points:[{x:480,y:360},{x:760,y:360}]},scene=parseScene({...world.scene,routes:[route],objects:world.scene.objects.map(o=>({...o,route:{id:'line',offset:0}}))}),moving={...world,scene};
 const foot=toggleRide(state,moving),boarded=toggleRide(foot,moving),next=stepInteractive(boarded,{throttle:1,steer:1},.5,moving);
 expect(boarded.control).toEqual(state.control);expect(next.control).toEqual(state.control);expect(next.x).toBeCloseTo(490);expect(next.y).toBe(360);expect(next.vehicles).toEqual(state.vehicles);
});
