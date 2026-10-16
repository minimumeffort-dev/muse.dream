import * as THREE from "three";
import type { Scene } from "../scene/schema";
import type { CarState } from "../sim/car";
import { bridgeCoordinates, bridgePolygon } from "../scene/landscape-dsl";
import { roadFootprint, ROAD_SURFACE_LIFT } from "../scene/road";
import { terrainHeight, waterAt } from "../scene/terrain";
import { WaterWaves } from "../sim/waves";
import {tiledMesh} from './batching';
import {streetPolygons} from '../scene/streets';
import { surfaceGeometry, surfaceHeight, bridgeHeightAt } from "./surface";
import { bridgeMaterial, toonMaterial, waterMaterial } from "./shaders";
import type { ActorPose } from "../sim/actors";

/** Static bridge meshes plus a small, persistent wave field for each water body. */
export class WorldLandscape {
  readonly group=new THREE.Group();
  readonly waters;
  private wakeDistance=0;
  private previousWater:string|undefined;
  private actorWakes=new Map<string,number>();
  constructor(readonly doc:Scene) {
    this.group.name="landscape-dsl";
    this.waters=(doc.terrain.landscape?.waters ?? []).map(water=> {
      const waves=new WaterWaves(water,doc.terrain);
      const pixels=new Uint8Array(waves.heights.length).fill(128);
      const texture=new THREE.DataTexture(pixels,waves.columns,waves.rows,THREE.RedFormat);
      texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;
      const geometry=surfaceGeometry(doc,[water.polygon],0,undefined,()=>0),positions=geometry.getAttribute("position"),uv=geometry.getAttribute("uv");
      const depths=new Float32Array(positions.count);
      for(let i=0;i<positions.count;i++) {
        depths[i]=water.level-terrainHeight(doc.terrain,positions.getX(i)+doc.canonical.width/2,positions.getZ(i)+doc.canonical.height/2);
        positions.setY(i,water.level+.25);
        uv.setXY(i,(positions.getX(i)+doc.canonical.width/2-waves.minX)/waves.width,
          (positions.getZ(i)+doc.canonical.height/2-waves.minY)/waves.height);
      }
      geometry.setAttribute("waterDepth",new THREE.BufferAttribute(depths,1));
      geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.boundingSphere!.radius+=3;
      if(doc.voxelWorld)geometry.userData.voxelOptions={cell:8,step:doc.voxelWorld.heightStep,lift:water.level+.25,thickness:2,maxMerge:1,rigid:true};
      const mesh=tiledMesh(geometry,waterMaterial(water,texture,waves,!!doc.voxelWorld));
      mesh.name=`water-${water.id}`;mesh.traverse(tile=>{tile.renderOrder=2;if(tile instanceof THREE.Mesh)tile.geometry.boundingSphere!.radius+=3;});this.group.add(mesh);
      return {water,waves,texture,pixels,version:waves.version};
    });
    const point=(x:number,y:number,lift:number,heightAt?:(x:number,y:number)=>number)=>new THREE.Vector3(x-doc.canonical.width/2,surfaceHeight(doc,x,y,heightAt)+lift,y-doc.canonical.height/2);
    const beams=new Map<THREE.Material,THREE.Matrix4[]>();
    const transform=new THREE.Object3D();
    const beam=(a:THREE.Vector3,b:THREE.Vector3,r:number,material:THREE.Material)=> {
      transform.position.copy(a).add(b).multiplyScalar(.5);
      transform.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());
      transform.scale.set(r,a.distanceTo(b),r);transform.updateMatrix();
      const instances=beams.get(material) ?? [];instances.push(transform.matrix.clone());beams.set(material,instances);
    };
    for(const bridge of doc.terrain.landscape?.bridges ?? []) {
      const {length,ux,uy}=bridgeCoordinates(bridge,bridge.a.x,bridge.a.y);
      const heightAt=bridgeHeightAt(doc,bridge);
      const footprint=bridgePolygon(bridge),minX=Math.min(...footprint.map(p=>p.x)),maxX=Math.max(...footprint.map(p=>p.x)),
        minY=Math.min(...footprint.map(p=>p.y)),maxY=Math.max(...footprint.map(p=>p.y));
      const roadway=[...roadFootprint(doc),...streetPolygons(doc.streets,'riding')].filter(polygon=>Math.max(...polygon.map(p=>p.x))>=minX && Math.min(...polygon.map(p=>p.x))<=maxX &&
        Math.max(...polygon.map(p=>p.y))>=minY && Math.min(...polygon.map(p=>p.y))<=maxY);
      // Timber is the driving surface; paved stone bridges retain a road corridor.
      const deckGeometry=surfaceGeometry(doc,[footprint],ROAD_SURFACE_LIFT,{x:ux,y:uy},heightAt,bridge.style==="timber" ? [] : roadway);
      const deck=doc.voxelWorld ? tiledMesh(deckGeometry,bridgeMaterial(bridge.style)) : new THREE.Mesh(deckGeometry,bridgeMaterial(bridge.style));
      deck.name=`bridge-${bridge.id}`;deck.traverse(n=>{if(n instanceof THREE.Mesh)n.castShadow=n.receiveShadow=true;});this.group.add(deck);
      const wood=toonMaterial(bridge.style==="timber" ? "#73503a" : "#797c82");
      const count=Math.ceil(length/24);
      for(const side of [-1,1]) {
        let previous:THREE.Vector3|undefined;
        for(let i=0;i<=count;i++) {
          const t=i/count,x=bridge.a.x+ux*length*t-uy*(bridge.width/2-2)*side,y=bridge.a.y+uy*length*t+ux*(bridge.width/2-2)*side;
          const base=point(x,y,0,heightAt),top=point(x,y,18,heightAt);
          if(previous) {
            beam(previous.clone().add(new THREE.Vector3(0,-16,0)),base,3.5,wood);
            if(bridge.rails) beam(previous,top,2.5,wood);
          }
          if(bridge.rails) beam(base,top,3,wood);
          if(i>0 && i<count && i%3===0) {
            const foot=base.clone();foot.y=terrainHeight(doc.terrain,x,y)-1;beam(foot,base,5,wood);
          }
          previous=top;
        }
      }
    }
    const cylinder=doc.voxelWorld ? new THREE.BoxGeometry(2,1,2) : new THREE.CylinderGeometry(1,1,1,6);
    for(const [material,matrices] of beams) {
      const mesh=new THREE.InstancedMesh(cylinder,material,matrices.length);
      matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.computeBoundingSphere();
      mesh.castShadow=mesh.receiveShadow=true;this.group.add(mesh);
    }
  }
  step(car:CarState,dt:number,motion=true):void {
    if(!motion) return;
    const water=waterAt(this.doc.terrain,car.x,car.y,car.elevation),speed=Math.hypot(car.vx,car.vy);
    this.wakeDistance+=speed*dt;
    if(water && (this.previousWater!==water.id || this.wakeDistance>=16)) {
      this.waters.find(entry=>entry.water===water)!.waves.disturb(car.x,car.y,-Math.min(1.5,.3+speed/200));this.wakeDistance=0;
    }
    this.previousWater=water?.id;
    for(const entry of this.waters) entry.waves.step(dt);
  }
  upload():void {
    for(const entry of this.waters) if(entry.version!==entry.waves.version) {
      // Byte-normalized heights interpolate on all supported WebGL hardware.
      for(let i=0;i<entry.pixels.length;i++) entry.pixels[i]=Math.round((entry.waves.heights[i]!+2)*255/4);
      entry.texture.needsUpdate=true;entry.version=entry.waves.version;
    }
  }
  stepActors(actors:ActorPose[],dt:number,motion=true):void {
    if(!motion)return;
    for(const actor of actors)if(actor.kind==="water"){
      const distance=(this.actorWakes.get(actor.id)??16)+actor.speed*dt;
      if(distance>=16){
        const entry=this.waters.find(e=>actor.elevation<e.water.level+.5 && waterAt(this.doc.terrain,actor.x,actor.y,actor.elevation)===e.water);
        entry?.waves.disturb(actor.x,actor.y,-.8);this.actorWakes.set(actor.id,0);
      }else this.actorWakes.set(actor.id,distance);
    }
  }
  clear():void {this.previousWater=undefined;this.wakeDistance=0;this.actorWakes.clear();for(const {waves} of this.waters) waves.clear();this.upload();}
}
