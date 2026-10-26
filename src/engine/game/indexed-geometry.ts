import type {BufferGeometry} from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Reuse identical painted vertices; keep hard normals, UV seams and rigid bone IDs. */
export function indexedGeometry(source:BufferGeometry):BufferGeometry{
  if(source.index)return source;
  const indexed=mergeVertices(source,1e-6),bytes=(g:BufferGeometry)=>Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(g.index?.array.byteLength??0);
  if(bytes(indexed)>=bytes(source)){indexed.dispose();return source;}
  indexed.userData=source.userData;source.dispose();return indexed;
}
