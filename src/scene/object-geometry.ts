import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {meshVoxels,type VoxelVolume,type VoxelSlice} from './voxels';
import type { ObjectPart } from "./object-dsl";
import {voxelStamp} from './voxel-stamp';

function basePartGeometry(shape: ObjectPart["shape"], size: ObjectPart["size"], taper=1,outline?:readonly (readonly [number,number])[]): THREE.BufferGeometry {
  switch (shape) {
    case "voxel": throw new Error("voxel requires validated volume data");
    case 'prism': {
      if(!outline)throw new Error('prism requires a validated outline');
      const path=new THREE.Shape(outline.map(([x,y])=>new THREE.Vector2(x-.5,y-.5)));
      path.closePath();return new THREE.ExtrudeGeometry(path,{depth:1,bevelEnabled:false,steps:1,curveSegments:1}).translate(0,0,-.5);
    }
    case "capsule": return new THREE.CapsuleGeometry(.5,1,5,12);
    case "torus": return new THREE.TorusGeometry(.42,.08,10,24);
    // Bevel in physical units before normalization, so long boards keep crisp ends.
    case "box": return new RoundedBoxGeometry(...size,2,Math.min(...size)*.12).scale(1/size[0],1/size[1],1/size[2]);
    case "sphere": return new THREE.SphereGeometry(0.5, 16, 12);
    case "cylinder": return new THREE.CylinderGeometry(0.5*taper, 0.5, 1, 16);
    case "cone": return new THREE.ConeGeometry(0.5, 1, 16);
    case "pyramid": return new THREE.ConeGeometry(0.5, 1, 4).rotateY(Math.PI / 4).scale(Math.SQRT2, 1, Math.SQRT2);
    case "icosphere": {
      const geo = new THREE.IcosahedronGeometry(.5, 1);
      geo.computeBoundingBox();
      const size = geo.boundingBox!.getSize(new THREE.Vector3());
      geo.scale(1 / size.x, 1 / size.y, 1 / size.z);
      geo.computeVertexNormals();
      return geo;
    }
  }
}

/** Mesh buffers are cached as CPU data; every caller owns disposable GPU attributes. */
export function voxelGeometry(volume:VoxelVolume,slice?:VoxelSlice):THREE.BufferGeometry {
  const data=meshVoxels(volume,slice),geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(data.positions.slice(),3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(data.normals.slice(),3));
  geometry.setAttribute('uv',new THREE.BufferAttribute(data.uvs.slice(),2));geometry.userData.voxel={kind:'volume',cells:data.cells,quads:data.quads};return geometry;
}

/** Variation is deterministic from position, so duplicated seam vertices remain joined. */
export function partGeometry(part:ObjectPart,voxelCell?:number):THREE.BufferGeometry {
  if(part.shape==='voxel' && 'voxels' in part && part.voxels)return voxelGeometry(part.voxels);
  let geometry=basePartGeometry(part.shape,part.size,"taper" in part ? part.taper : undefined,'outline' in part ? part.outline : undefined);
  const faceted='faceted' in part && part.faceted===true;
  const deform="deform" in part ? part.deform : undefined;
  if(deform?.amount) {
    const positions=geometry.getAttribute("position");
    for(let i=0;i<positions.count;i++) {
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),seed=deform.seed*.731;
      const noise=(Math.sin(x*7.1+y*3.7+seed)+Math.sin(y*5.3+z*6.1-seed*.7)+Math.sin(z*8.3+x*4.9+seed*1.3))/3;
      const factor=1+noise*deform.amount;positions.setXYZ(i,x*factor,y*factor,z*factor);
    }
  }
  if(deform || part.shape==="capsule" || part.shape==="torus") {
    geometry.computeBoundingBox();const bounds=geometry.boundingBox!,center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
    geometry.translate(-center.x,-center.y,-center.z);geometry.scale(1/size.x,1/size.y,1/size.z);geometry.computeVertexNormals();
  }
  if(faceted){if(geometry.index){const flat=geometry.toNonIndexed();geometry.dispose();geometry=flat;}geometry.computeVertexNormals();}
  if(voxelCell){const result=voxelStamp(geometry,part.size,voxelCell,JSON.stringify([part.shape,part.size,'taper' in part ? part.taper : null,'outline' in part ? part.outline : null,deform,faceted]),!deform?.amount && (faceted || part.shape==='prism'||part.shape==='pyramid'));geometry.dispose();return result;}
  return geometry;
}

