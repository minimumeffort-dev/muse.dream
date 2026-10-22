import {sceneInteriors} from '../scene/interiors';
import * as THREE from "three";
import type { CarState } from "../sim/car";
import type { Scene } from "../scene/schema";
import { waterAt,drivingHeight } from "../scene/terrain";
import {sampleWeather} from '../scene/weather';
import { worldPosition } from "./environment";
import { particleMaterial,voxelParticleMaterial } from "./shaders";
import type { ActorPose } from "../sim/actors";
import { objectPlacement } from "../scene/placement";
import type { ImpactEvent } from "../sim/impacts";

const CAP = 256, MOTES = 32;
const DUST = new THREE.Color("#c6b68a"), ROAD = new THREE.Color("#a2adb6");
const WATER = new THREE.Color("#a8e8e0");
const WOOD = new THREE.Color("#c6a16b"), MASONRY = new THREE.Color("#bc9780");
const ICE = new THREE.Color("#b4eaff").multiplyScalar(1.3), SPARK = new THREE.Color("#ffbb50").multiplyScalar(2.8);

/** One fixed GPU draw and a bounded pool for dust, shards, sparks and ambient life. */
export class WorldParticles {
  readonly mesh: THREE.Points|THREE.Mesh;
  private positions = new Float32Array((CAP + MOTES) * 3);
  private colors = new Float32Array((CAP + MOTES) * 3);
  private opacity = new Float32Array(CAP + MOTES);
  private size = new Float32Array(CAP + MOTES);
  private kind = new Float32Array(CAP + MOTES);
  private angle = new Float32Array(CAP + MOTES);
  private velocity = new Float32Array(CAP * 3);
  private life = new Float32Array(CAP);
  private duration = new Float32Array(CAP);
  private index = 0;
  private emission = 0;
  private time = 0;
  private boostLife = 0;
  private emitterClock=new Map<string,number>();
  private rainClock=0;
  private rainFloor=new Float32Array(CAP);
  private emitters;

  constructor(private doc: Scene) {
    this.emitters=doc.objects.flatMap(object=>object.spec && "dslVersion" in object.spec && object.spec.dslVersion===2 && object.spec.emitter ? [{object,emitter:object.spec.emitter}] : []);
    const geometry = doc.voxelWorld ? new THREE.InstancedBufferGeometry() : new THREE.BufferGeometry();
    if(doc.voxelWorld){const cube=new THREE.BoxGeometry(1,1,1);geometry.setIndex(cube.index);for(const [name,attribute] of Object.entries(cube.attributes))geometry.setAttribute(name,attribute);}
    for(const [name,array,itemSize] of [
      ["position",this.positions,3],["color",this.colors,3],["opacity",this.opacity,1],
      ["size",this.size,1],["kind",this.kind,1],["angle",this.angle,1],
    ] as const) geometry.setAttribute(doc.voxelWorld && name==='position' ? 'offset' : name,(doc.voxelWorld ? new THREE.InstancedBufferAttribute(array,itemSize) : new THREE.BufferAttribute(array,itemSize)).setUsage(THREE.DynamicDrawUsage));
    if(geometry instanceof THREE.InstancedBufferGeometry)geometry.instanceCount=CAP+MOTES;
    this.mesh = doc.voxelWorld ? new THREE.Mesh(geometry,voxelParticleMaterial()) : new THREE.Points(geometry, particleMaterial());
    this.mesh.frustumCulled = false;
  }

  get activeCount(): number { let count=0;for(const age of this.life) if(age>0) count++;return count; }

  clear(): void {
    this.life.fill(0); this.opacity.fill(0); this.emission = 0; this.boostLife=0;
    this.emitterClock.clear();
    this.rainClock=0;
    this.mesh.geometry.getAttribute("opacity").needsUpdate = true;
  }
  objectImpacts(car:CarState,events:ImpactEvent[],enabled:boolean):void {
    if(!enabled)return;
    for(const event of events)for(let i=0;i<(event.kind==="break" ? 22 : event.kind==="topple" ? 12 : 6);i++){
      this.emit({...car,x:event.x,y:event.y,elevation:event.elevation,surface:"paper"},0,true);
      const slot=(this.index-1)%CAP;
      if(event.pattern==="splinter" || event.pattern==="crumble"){
        (event.pattern==="splinter" ? WOOD : MASONRY).toArray(this.colors,slot*3);
        this.size[slot]=event.pattern==="splinter" ? 7 : 18;
      }
    }
  }

  private emit(car:CarState,kind:number,burst=false):void {
    const i=this.index++%CAP, offset=i*3, heading=car.headingRad, side=(i%2?1:-1)*(car.control.kind==='foot' ? 2 : 7);
    const theta=Math.random()*Math.PI*2;
    const behind=car.control.kind==='foot' ? 3 : 13;
    const x=car.x-Math.cos(heading)*behind-Math.sin(heading)*side;
    const y=car.y-Math.sin(heading)*behind+Math.cos(heading)*side;
    const position=worldPosition(this.doc,x,y);
    position.y=(kind===4 ? waterAt(this.doc.terrain,car.x,car.y,car.elevation)?.level ?? car.elevation : car.elevation)+4;
    position.toArray(this.positions,offset);
    const spark=kind===1, ice=kind===2;
    (kind===4 || kind===7?WATER:spark?SPARK:ice?ICE:car.surface==="paper"?DUST:ROAD).toArray(this.colors,offset);
    const scatter=burst?60:spark?22:ice?38:16;
    this.velocity[offset]=-car.vx*(spark?.3:.08)+Math.cos(theta)*scatter;
    this.velocity[offset+1]=kind===7?5+Math.random()*5:spark?25+Math.random()*30:ice||kind===4?25+Math.random()*25:8+Math.random()*12;
    this.velocity[offset+2]=-car.vy*(spark?.3:.08)+Math.sin(theta)*scatter;
    this.duration[i]=kind===7?.35+Math.random()*.2:spark?.45+Math.random()*.3:ice?.65:.9+Math.random()*.4;
    this.life[i]=this.duration[i]!;this.size[i]=kind===7?6:spark?8:ice?7:burst?14:10;
    this.kind[i]=kind;this.angle[i]=theta;
  }

  update(car: CarState, dt: number, enabled: boolean, boost = false, landingSpeed = 0, collisionSpeed = 0,actors:ActorPose[]=[]): void {
    if (!enabled) { this.clear(); return; }
    this.time+=dt;this.boostLife=boost?.45:Math.max(0,this.boostLife-dt);
    const speed=car.control.kind==="passenger" || car.control.kind==='foot' && car.surface!=='water' ? 0 : Math.hypot(car.vx,car.vy), slip=Math.abs(-Math.sin(car.headingRad)*car.vx+Math.cos(car.headingRad)*car.vy);
    const weather=sampleWeather(this.doc.weather,car.timeS),spray=weather.wetness>.1 && !sceneInteriors(this.doc).some(f=>f.contains(car.x,car.y) && car.elevation<f.ceiling);
    const wet=car.surface==="water",icy=car.surface==="ice", dusty=car.surface==="paper", boosting=this.boostLife>0 || car.timeS<car.carBoost.activeUntilS;
    const swimmer=car.control.kind==='foot' && wet,rate=swimmer ? 14 : boosting?110:dusty?65:wet||icy||slip>35?48:12;
    this.emission+=dt*((car.grounded&&speed>(swimmer ? 8 : 45))||boosting?rate:0);
    while(this.emission>=1){this.emission--;this.emit(car,wet?4:boosting?1:icy?2:spray?7:0);}
    if(boost) for(let i=0;i<20;i++) this.emit(car,1,true);
    if(landingSpeed>25) for(let i=0;i<Math.min(42,Math.ceil(landingSpeed*.2));i++) this.emit(car,wet?4:icy?2:0,true);
    if(collisionSpeed>80) for(let i=0;i<Math.min(24,Math.ceil(collisionSpeed*.07));i++) this.emit(car,1,true);
    for(const {object,emitter} of this.emitters){
      const actor=actors.find(p=>p.id===object.id),x=actor?.x ?? object.x,y=actor?.y ?? object.y;
      if(Math.hypot(x-car.x,y-car.y)>600)continue;
      let clock=(this.emitterClock.get(object.id)??0)+dt*emitter.rate;
      while(clock>=1){
        clock--;const i=this.index++%CAP,offset=i*3,heading=actor?.headingRad ?? object.headingRad ?? 0,c=Math.cos(heading),s=Math.sin(heading);
        const p=worldPosition(this.doc,x+(emitter.position[0]*c-emitter.position[2]*s)*object.scale,y+(emitter.position[0]*s+emitter.position[2]*c)*object.scale);
        p.y=(actor?.elevation ?? objectPlacement(this.doc,object).base)+emitter.position[1]*object.scale;p.toArray(this.positions,offset);
        this.colors.set([.85,.85,.78],offset);this.velocity.set([4+(actor ? Math.cos(heading)*actor.speed*.15 : 0),14,3+(actor ? Math.sin(heading)*actor.speed*.15 : 0)],offset);
        this.duration[i]=this.life[i]=1.8;this.size[i]=8;this.kind[i]=5;this.angle[i]=0;
      }
      this.emitterClock.set(object.id,clock);
    }
    this.rainClock+=dt*weather.rain*100;
    while(this.rainClock>=1){
      this.rainClock--;const i=this.index++%CAP,offset=i*3,x=car.x+(Math.random()-.5)*1000,y=car.y+(Math.random()-.5)*1000;
      if(x<0 || y<0 || x>this.doc.canonical.width || y>this.doc.canonical.height)continue;
      let floor=drivingHeight(this.doc.terrain,x,y);floor=Math.max(floor,waterAt(this.doc.terrain,x,y,floor)?.level??floor);
      for(const f of sceneInteriors(this.doc))if(f.contains(x,y))floor=Math.max(floor,f.ceiling+1.5);
      const height=Math.max(floor,car.elevation)+40+Math.random()*160;
      const point=worldPosition(this.doc,x,y);point.y=height;point.toArray(this.positions,offset);this.rainFloor[i]=floor;
      this.colors.set([.65,.78,.85],offset);this.velocity.set([8,-180,3],offset);
      this.duration[i]=this.life[i]=Math.min(2,(height-floor)/180);this.size[i]=14;this.kind[i]=6;this.angle[i]=0;
    }
    for(let i=0;i<CAP;i++) {
      this.life[i]=Math.max(0,this.life[i]!-dt);
      const age=1-this.life[i]!/(this.duration[i]||1), kind=this.kind[i]!;
      this.opacity[i]=this.life[i]!>0?kind===6 ? .4*Math.min(1,age*12) : Math.min(1,age*10)*(1-age)*(kind===7?.25:kind===0 || kind===5?.45:.9):0;
      if(!this.life[i]) continue;
      const offset=i*3;
      if(kind===6){
        for(let axis=0;axis<3;axis++)this.positions[offset+axis]=this.positions[offset+axis]!+this.velocity[offset+axis]!*dt;
        if(this.positions[offset+1]!<=this.rainFloor[i]!){this.life[i]=0;this.opacity[i]=0;}
        continue;
      }
      const damping=Math.exp(-dt*(kind===0?1.4:.4));
      this.velocity[offset]=this.velocity[offset]!*damping;
      this.velocity[offset+2]=this.velocity[offset+2]!*damping;
      this.velocity[offset+1]=this.velocity[offset+1]!-dt*(kind===0 || kind===5?-3:85);
      for(let axis=0;axis<3;axis++) this.positions[offset+axis]=this.positions[offset+axis]!+this.velocity[offset+axis]!*dt;
      this.size[i]=Math.max(1,this.size[i]!+dt*(kind===0 || kind===5?13:-4));
      this.angle[i]=this.angle[i]!+dt*(kind===2?3:.3);
    }
    // World-anchored cells avoid motes moving along with the car like a screen overlay.
    for(let i=0;i<MOTES;i++) {
      const j=CAP+i,x=(Math.floor(car.x/120)+(i%8)-3)*120+(i*73%100);
      const y=(Math.floor(car.y/120)+Math.floor(i/8)-1)*120+(i*41%100);
      const p=worldPosition(this.doc,x,y,16+(i*17%70)+Math.sin(this.time*.7+i)*8);
      p.toArray(this.positions,j*3);this.colors.set(i%3?[1.3,1.1,.5]:[.7,1.3,1.1],j*3);
      this.opacity[j]=sceneInteriors(this.doc).some(f=>f.contains(x,y) && p.y<f.ceiling+1.5) ? 0 : (1-weather.rain)*Math.max(0,1-Math.hypot(x-car.x,y-car.y)/400)*(.3+Math.sin(this.time*1.2+i)*.18);
      this.size[j]=i%3?3:4;this.kind[j]=3;this.angle[j]=0;
    }
    for(const name of ["position","color","opacity","size","kind","angle"]) this.mesh.geometry.getAttribute(this.doc.voxelWorld && name==='position' ? 'offset' : name).needsUpdate=true;
  }
}
