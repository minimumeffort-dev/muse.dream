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

import type {SceneObject} from '../scene/schema';
import {matchRoster} from '../scene/sports-match';
import {measuredScale,assemblyBounds} from '../scene/measure';
import {ambientPrototype} from './ambient-population';
import {ambientMaterial} from './shaders';
import {teamPose,teamVenue} from '../sim/team-sports';
import {walkingHeight} from '../scene/interiors';
import {finishBuild} from './batching';

type TeamBatch={rows:{game:string;id:string;scale:number}[];meshes:THREE.InstancedMesh[];radius:number};
/** All roster members share bone-local GPU geometry, including depth-pass poses. */
export class SportsTeamsVisuals {
 readonly group=new THREE.Group();
 private batches:TeamBatch[]=[];
 private matrix=new THREE.Matrix4();private rotation=new THREE.Quaternion();private position=new THREE.Vector3();private size=new THREE.Vector3();private up=new THREE.Vector3(0,1,0);private sphere=new THREE.Sphere();
 private view=new THREE.Frustum();private shadow=new THREE.Frustum();private projection=new THREE.Matrix4();
 constructor(private scene:Scene,defer=false){this.group.name='sports-teams';if(!defer)finishBuild(this.assemble());}
 static *buildSteps(scene:Scene):Generator<void,SportsTeamsVisuals>{const teams=new SportsTeamsVisuals(scene,true);yield* teams.assemble();return teams;}
 private *assemble():Generator<void>{
  const groups=new Map<string,{spec:ReturnType<typeof matchRoster>[number]['spec'];rows:TeamBatch['rows']}>();
  for(const sport of this.scene.sports)if(sport.match)for(const member of matchRoster(sport.id,sport.match)){
   const key=JSON.stringify(member.spec),batch=groups.get(key)??{spec:member.spec,rows:[]};batch.rows.push({game:sport.id,id:member.id,scale:measuredScale(member.spec)});groups.set(key,batch);
  }
  for(const {spec,rows} of groups.values()){
   yield;
   const object:SceneObject={id:rows[0]!.id,kind:'custom',role:'npc',x:0,y:0,scale:1,spec,labelText:spec.displayName},root=ambientPrototype(object),meshes:THREE.InstancedMesh[]=[],joints=spec.joints!;
   for(const child of root.children){const source=child as THREE.Mesh,geometry=source.geometry;
    geometry.setAttribute('popCycle',new THREE.InstancedBufferAttribute(new Float32Array(rows.length*3),3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('popPlay',new THREE.InstancedBufferAttribute(new Float32Array(rows.length*2),2).setUsage(THREE.DynamicDrawUsage));
    const mesh=new THREE.InstancedMesh(geometry,ambientMaterial(source.material as THREE.Material,joints,false,true),rows.length);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.customDepthMaterial=ambientMaterial(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}),joints,true,true);this.group.add(mesh);meshes.push(mesh);
   }
   const radius=assemblyBounds(spec).getSize(new THREE.Vector3()).length()*Math.max(...rows.map(r=>r.scale))+8;
   this.batches.push({rows,meshes,radius});
  }
 }
 update(state:CarState,camera:THREE.Camera,light:THREE.DirectionalLight,reduced=false){
  this.view.setFromProjectionMatrix(this.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));this.shadow.setFromProjectionMatrix(this.projection.multiplyMatrices(light.shadow.camera.projectionMatrix,light.shadow.camera.matrixWorldInverse));
  const venues=new Map(this.scene.sports.map(s=>[s.id,teamVenue(this.scene,state,s.id)]));
  for(const batch of this.batches){let count=0;
   for(const row of batch.rows){if(venues.get(row.game)!==row.game)continue;const game=state.sports.find(g=>g.id===row.game)!,match=game.match!,member=match.members.find(m=>m.id===row.id)!,pose=teamPose(match,member);
    this.position.set(pose.x-this.scene.canonical.width/2,walkingHeight(this.scene,pose.x,pose.y,3)+.2,pose.y-this.scene.canonical.height/2);this.sphere.set(this.position,batch.radius);if(!this.view.intersectsSphere(this.sphere) && !this.shadow.intersectsSphere(this.sphere))continue;
    this.rotation.setFromAxisAngle(this.up,-pose.heading);this.size.setScalar(row.scale);this.matrix.compose(this.position,this.rotation,this.size);
    const action=match.status!=='playing' || reduced || member.actionUntilS<=match.elapsedS ? 0 : member.action==='kick' ? 1 : member.action==='throw' ? 2 : member.action==='contest' ? 3 : 0,progress=1-Math.max(0,member.actionUntilS-match.elapsedS)/(.45+(member.action==='contest' ? .05 : 0));
    for(const mesh of batch.meshes){mesh.setMatrixAt(count,this.matrix);(mesh.geometry.getAttribute('popCycle') as THREE.InstancedBufferAttribute).setXYZ(count,match.elapsedS,pose.cycle,reduced ? 0 : Math.min(1,pose.speed/22)+Math.max(0,Math.min(1,(pose.speed-22)/30)));(mesh.geometry.getAttribute('popPlay') as THREE.InstancedBufferAttribute).setXY(count,action,progress);}count++;
   }
   for(const mesh of batch.meshes){mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;(mesh.geometry.getAttribute('popCycle') as THREE.InstancedBufferAttribute).needsUpdate=true;(mesh.geometry.getAttribute('popPlay') as THREE.InstancedBufferAttribute).needsUpdate=true;}
  }
 }
 dispose(){for(const batch of this.batches)for(const mesh of batch.meshes){mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();mesh.customDepthMaterial?.dispose();mesh.dispose();}this.group.clear();this.batches=[];}
}
