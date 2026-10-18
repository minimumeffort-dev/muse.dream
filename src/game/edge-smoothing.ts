import {RGFormat,RGBAFormat,UnsignedByteType,Scene,Mesh,PlaneGeometry,OrthographicCamera,type WebGLRenderer} from 'three';
import {SMAAPass} from 'three/examples/jsm/postprocessing/SMAAPass.js';

/** Runs after output conversion: edge flags and blend weights need normalized storage, not HDR buffers. */
export async function worldEdgeSmoothing(){
 const pass=new SMAAPass(1,1);
 pass.edgesRT.texture.format=RGFormat;pass.edgesRT.texture.type=UnsignedByteType;
 pass.weightsRT.texture.format=RGBAFormat;pass.weightsRT.texture.type=UnsignedByteType;
 try{await Promise.all([pass.areaTexture.image,pass.searchTexture.image].map((image:HTMLImageElement)=>image.decode()));return pass;}
 catch(error){pass.dispose();throw error;}
}
/** The existing first-frame preparation owner also waits for the three smoothing programs. */
export async function prepareWorldEdges(renderer:WebGLRenderer,pass:SMAAPass){
 const scene=new Scene(),geometry=new PlaneGeometry(2,2),mesh=new Mesh(geometry,pass.materialEdges),camera=new OrthographicCamera(-1,1,1,-1,0,1),previous=renderer.getRenderTarget();scene.add(mesh);
 try{for(const [material,target] of [[pass.materialEdges,pass.edgesRT],[pass.materialWeights,pass.weightsRT],[pass.materialBlend,null]] as const){mesh.material=material;renderer.setRenderTarget(target);await renderer.compileAsync(scene,camera);}}
 finally{renderer.setRenderTarget(previous);geometry.dispose();}
}
