import {afterAll,it,expect} from 'vitest';
import {Box3,Mesh,OrthographicCamera,Vector3} from 'three';
import {compileDream} from '../src/scene/dream';
import {measuredScale} from '../src/scene/measure';
import {buildObject} from '../src/game/world3d';
import {positionGalleryCamera} from './visual/gallery-camera';
import source from '../src/scene/world/tower_assets.dream?raw';

const models=compileDream(source).map(spec=>{
 const group=buildObject({id:'tower',kind:'custom',labelText:spec.displayName,x:0,y:0,scale:measuredScale(spec),spec:{...spec,voxelSize:1}});group.updateMatrixWorld(true);
 const bounds=new Box3().setFromObject(group,true),center=bounds.getCenter(new Vector3()),size=bounds.getSize(new Vector3());
 return {spec,group,center,size};
});
afterAll(()=>models.forEach(({group})=>group.traverse(n=>{if(n instanceof Mesh){n.geometry.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose();}})));

it.each(models)('keeps the complete $spec.displayName geometry inside the gallery frustum from four angles',({group,center,size})=>{
 const half=Math.max(size.x,size.y,size.z)*.76,camera=new OrthographicCamera(-half,half,half,-half,.1,2000),point=new Vector3();
 for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  positionGalleryCamera(camera,center,size.length()/2,angle);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);let vertices=0;
  group.traverse(n=>{if(!(n instanceof Mesh))return;const positions=n.geometry.getAttribute('position');for(let i=0;i<positions.count;i++){
   point.fromBufferAttribute(positions,i).applyMatrix4(n.matrixWorld).project(camera);
   expect(Math.max(Math.abs(point.x),Math.abs(point.y),Math.abs(point.z))).toBeLessThan(1);vertices++;
  }});
  expect(vertices).toBeGreaterThan(1000);
 }
});

it('retains the original small-asset view angle and keeps larger bounds between the depth planes',()=>{
 const camera=new OrthographicCamera(-1,1,1,-1,.1,2000),center=new Vector3(7,11,13),angle=.7;
 positionGalleryCamera(camera,center,20,angle);expect(camera.position.toArray()).toEqual([center.x+110*Math.cos(angle)+150*Math.sin(angle),center.y+110,center.z+150*Math.cos(angle)-110*Math.sin(angle)]);
 const direction=camera.position.clone().sub(center).normalize(),radius=1600;positionGalleryCamera(camera,center,radius,angle);
 expect(camera.position.clone().sub(center).normalize().distanceTo(direction)).toBeLessThan(1e-12);
 const distance=camera.position.distanceTo(center);expect(distance-radius).toBeGreaterThan(camera.near);expect(distance+radius).toBeLessThan(camera.far);
});
