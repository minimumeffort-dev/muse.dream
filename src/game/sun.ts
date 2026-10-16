import * as THREE from "three";
import {DEFAULT_CAMERA_ZOOM} from "./camera";

const direction=new THREE.Vector3(-300,690,220).normalize();
const rotation=new THREE.Matrix4().lookAt(direction,new THREE.Vector3(),new THREE.Vector3(0,1,0));
const right=new THREE.Vector3().setFromMatrixColumn(rotation,0);
const up=new THREE.Vector3().setFromMatrixColumn(rotation,1);
const margin=64;

/** One sun, with a world-aligned pixel grid covering the whole orthographic view. */
export class SunShadows {
  private bounds=new THREE.Box3();
  private point=new THREE.Vector3();
  private origin=new THREE.Vector3();
  private view=new THREE.Vector3();
  private center=new THREE.Vector3();

  constructor(readonly light:THREE.DirectionalLight,readonly minHeight:number,readonly maxHeight:number){
    light.castShadow=true;
    light.shadow.mapSize.set(2048,2048);
    light.shadow.normalBias=.6;light.shadow.bias=-.0001;light.shadow.radius=3;
  }

  update(camera:THREE.OrthographicCamera):void {
    this.bounds.makeEmpty();camera.getWorldDirection(this.view);
    // Retain the widest gameplay view while boarding zoom eases in and out.
    const extent=camera.zoom/Math.min(camera.zoom,DEFAULT_CAMERA_ZOOM);
    for(const x of [-extent,extent])for(const y of [-extent,extent]){
      this.origin.set(x,y,-1).unproject(camera);
      for(const height of [this.minHeight,this.maxHeight]){
        this.point.copy(this.origin).addScaledVector(this.view,(height-this.origin.y)/this.view.y);
        this.point.set(this.point.dot(right),this.point.dot(up),this.point.dot(direction));
        this.bounds.expandByPoint(this.point);
      }
    }
    // Quantize the extents too, so floating-point noise cannot resize the grid.
    const halfX=Math.ceil(((this.bounds.max.x-this.bounds.min.x)/2+margin)/16)*16;
    const halfY=Math.ceil(((this.bounds.max.y-this.bounds.min.y)/2+margin)/16)*16;
    const texelX=2*halfX/this.light.shadow.mapSize.x,texelY=2*halfY/this.light.shadow.mapSize.y;
    const x=Math.round((this.bounds.min.x+this.bounds.max.x)/2/texelX)*texelX;
    const y=Math.round((this.bounds.min.y+this.bounds.max.y)/2/texelY)*texelY;
    const z=(this.bounds.min.z+this.bounds.max.z)/2;
    this.center.copy(right).multiplyScalar(x).addScaledVector(up,y).addScaledVector(direction,z);
    // Include offscreen casters up to the accepted world's highest moving object.
    const reach=(this.maxHeight-this.minHeight)/direction.y+margin;
    const distance=(this.bounds.max.z-this.bounds.min.z)/2+reach;
    this.light.target.position.copy(this.center);
    this.light.position.copy(this.center).addScaledVector(direction,distance);
    const shadow=this.light.shadow.camera;
    Object.assign(shadow,{left:-halfX,right:halfX,bottom:-halfY,top:halfY,near:.5,far:distance+(this.bounds.max.z-this.bounds.min.z)/2+margin});
    shadow.updateProjectionMatrix();
    this.light.updateMatrixWorld();this.light.target.updateMatrixWorld();this.light.shadow.updateMatrices(this.light);
  }
}
