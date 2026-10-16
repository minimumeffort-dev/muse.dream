import * as THREE from "three";
import {voxelSurface,type ColumnOptions} from './voxel-columns';

/** Only for world-fixed roots: GPU wind, water and instance fades still animate normally. */
export function freezeStatic(root:THREE.Object3D):void {
  root.updateWorldMatrix(true,true);
  root.traverse(node=>{node.matrixAutoUpdate=false;node.matrixWorldAutoUpdate=false;});
}

/** Split static triangles into local bounds so Three can cull terrain and road tiles. */
export function tiledMesh(geometry: THREE.BufferGeometry, material: THREE.Material, tileSize = 400): THREE.Group {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const positions = source.getAttribute("position"), tiles = new Map<string, number[]>();
  for (let i = 0;i < positions.count;i += 3) {
    const x = (positions.getX(i) + positions.getX(i + 1) + positions.getX(i + 2)) / 3;
    const z = (positions.getZ(i) + positions.getZ(i + 1) + positions.getZ(i + 2)) / 3;
    const key = `${Math.floor(x / tileSize)},${Math.floor(z / tileSize)}`;
    const indices = tiles.get(key) ?? []; indices.push(i, i + 1, i + 2); tiles.set(key, indices);
  }
  const group = new THREE.Group();
  for (const indices of tiles.values()) {
    const geo = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(source.attributes)) {
      const values = new Float32Array(indices.length * attribute.itemSize);
      indices.forEach((index, i) => { for (let c = 0;c < attribute.itemSize;c++) values[i * attribute.itemSize + c] = attribute.array[index * attribute.itemSize + c]!; });
      geo.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize));
    }
    geo.computeBoundingSphere();
    const options=geometry.userData.voxelOptions as ColumnOptions|undefined;
    const rendered=options ? voxelSurface(geo,options) : geo;if(options)geo.dispose();
    const mesh = new THREE.Mesh(rendered, material); mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; group.add(mesh);
  }
  if (source !== geometry) source.dispose(); geometry.dispose(); return group;
}

export function tiledInstances(geometry: THREE.BufferGeometry, material: THREE.Material, transforms: THREE.Matrix4[], colors: THREE.Color[] = []): THREE.Group {
  const tiles = new Map<string, number[]>();
  transforms.forEach((m, i) => {
    const key = `${Math.floor(m.elements[12]! / 400)},${Math.floor(m.elements[14]! / 400)}`;
    const list = tiles.get(key) ?? []; list.push(i); tiles.set(key, list);
  });
  const group = new THREE.Group();
  for (const indices of tiles.values()) {
    const mesh = new THREE.InstancedMesh(geometry, material, indices.length);
    indices.forEach((source, i) => { mesh.setMatrixAt(i, transforms[source]!); if (colors[source]) mesh.setColorAt(i, colors[source]!); });
    mesh.computeBoundingSphere(); mesh.receiveShadow = true; group.add(mesh);
  }
  return group;
}
