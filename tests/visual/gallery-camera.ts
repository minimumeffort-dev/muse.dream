import {OrthographicCamera,Vector3} from 'three';

const offset=new Vector3();
/** Orthographic framing and camera distance are separate: tall assets must clear the near plane. */
export function positionGalleryCamera(camera:OrthographicCamera,center:Vector3,radius:number,angle:number):void{
 offset.set(110*Math.cos(angle)+150*Math.sin(angle),110,150*Math.cos(angle)-110*Math.sin(angle));
 const distance=Math.max(offset.length(),radius*2);
 camera.position.copy(offset).setLength(distance).add(center);
 camera.far=Math.max(2000,distance+radius+1);
 camera.lookAt(center);
}
