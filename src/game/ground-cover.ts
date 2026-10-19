import * as THREE from 'three';
import source from '../scene/ground-cover.dream?raw';
import {compileDream} from '../scene/dream';
import {measuredScale} from '../scene/measure';
import {buildObject} from './world3d';
import {compactObject} from './compact-object';
import {indexedGeometry} from './indexed-geometry';
import {disposeChunk} from './chunk-packet';

let templates:ReturnType<typeof compileDream>|undefined;
/** Engine-owned detail templates use ordinary Dream parts and the ordinary asset builder. */
export function groundCoverGeometry(kind:'grass'|'flower',voxelSize?:number):THREE.BufferGeometry{
 const spec=(templates??=compileDream(source))[kind==='grass' ? 0 : 1]!;
 const root=compactObject(buildObject({id:'ground-cover',kind:'custom',labelText:spec.displayName,x:0,y:0,scale:measuredScale(spec),spec:{...spec,voxelSize}}));
 const mesh=root.children[0];
 if(root.children.length!==1 || !(mesh instanceof THREE.Mesh)){disposeChunk(root);throw Error('ground cover must compact into one static painted mesh');}
 root.updateMatrixWorld(true);const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
 // Ground cover has no mechanisms, material relief or night emission.
 for(const name of Object.keys(geometry.attributes))if(!['position','normal','color'].includes(name))geometry.deleteAttribute(name);
 disposeChunk(root);return indexedGeometry(geometry);
}
