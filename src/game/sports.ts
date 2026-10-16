import * as THREE from 'three';
import type {Scene} from '../scene/schema';
import type {CarState} from '../sim/car';
import {activeSport,sportShot} from '../sim/sports';
import {drivingHeight} from '../scene/terrain';
import {worldPosition} from './environment';

/** Assembly roots sit at the feet; a rolling ball must keep its physical centre fixed. */
export function poseSportBall(group:THREE.Group,spin:THREE.Quaternion,radius:number){
  const center=new THREE.Vector3(0,radius,0).applyQuaternion(group.quaternion);
  group.quaternion.premultiply(spin);
  group.position.add(center).sub(new THREE.Vector3(0,radius,0).applyQuaternion(group.quaternion));
}

/** Two shared draws for the active ball and an obstacle-free shot preview. */
export class SportsVisuals {
  readonly group=new THREE.Group();
  private ring=new THREE.Mesh(new THREE.RingGeometry(1,1.25,32),new THREE.MeshBasicMaterial({color:'#ffe2a3',side:THREE.DoubleSide,transparent:true,opacity:.85,depthWrite:false}));
  private points=new Float32Array(33*3);
  private arc=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:'#ffe2a3',dashSize:2,gapSize:2,transparent:true,opacity:.8}));
  constructor(private scene:Scene){
    this.ring.rotation.x=-Math.PI/2;
    this.arc.geometry.setAttribute('position',new THREE.BufferAttribute(this.points,3).setUsage(THREE.DynamicDrawUsage));
    this.arc.frustumCulled=false;this.group.add(this.ring,this.arc);
  }
  update(state:CarState,court:ReturnType<typeof activeSport>){
    this.group.visible=!!court;if(!court)return;
    const game=state.sports.find(g=>g.id===court.sport.id)!,ball=state.props.find(p=>p.id===court.sport.ballId)!;
    this.ring.position.copy(worldPosition(this.scene,ball.x,ball.y));
    this.ring.position.y=drivingHeight(this.scene.terrain,ball.x,ball.y)+2;
    this.ring.scale.setScalar(court.radius+2);
    this.arc.visible=game.possessed;
    if(!this.arc.visible)return;
    const shot=sportShot(state,game,court),friction=court.object.spec && 'dslVersion' in court.object.spec ? court.object.spec.body.frictionPerS??.7 : .7;
    const dt=1/120,retention=Math.exp(-friction*dt);
    if(game.chargeStartS===null){
      const length=Math.hypot(shot.vx,shot.vy)||1;
      for(let i=0;i<33;i++){const x=ball.x+shot.vx/length*i/32*18,y=ball.y+shot.vy/length*i/32*18,p=worldPosition(this.scene,x,y);p.y=drivingHeight(this.scene.terrain,x,y)+2;p.toArray(this.points,i*3);}
      this.arc.geometry.getAttribute('position').needsUpdate=true;this.arc.computeLineDistances();return;
    }
    for(let i=0;i<33;i++){
      const point=worldPosition(this.scene,shot.x,shot.y);point.y=(shot.elevation??0)+court.radius+1.5;point.toArray(this.points,i*3);
      for(let step=0;step<5;step++){
        shot.vx*=retention;shot.vy*=retention;shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;
        shot.elevation=(shot.elevation??0)+(shot.vz??0)*dt-150*dt*dt;shot.vz=(shot.vz??0)-300*dt;
        const floor=drivingHeight(this.scene.terrain,shot.x,shot.y);
        if(shot.elevation<floor){shot.elevation=floor;shot.vz=Math.abs(shot.vz)*.62;}
      }
    }
    this.arc.geometry.getAttribute('position').needsUpdate=true;this.arc.computeLineDistances();
  }
}
