import { measuredScale } from "../../src/scene/measure";
import * as THREE from 'three';
import { createWorldScene } from '../../src/scene/world-fixture';
import { parseScene } from '../../src/scene/schema';
import { buildObject, animateObject } from '../../src/game/world3d';
import { WorldScenery } from '../../src/game/scenery';
import { worldTime, worldMotion } from '../../src/game/shaders';
import { inventionExamples } from '../../src/scene/mock-creations';
import { dreamExamples } from '../../src/scene/dream-creations';
import { interactiveWorld } from '../../src/scene/interactive-world';
import {isActor} from '../../src/scene/agents';
import { hasAnimatedJoints,isReactive } from '../../src/scene/object-dsl';
import { mockCar } from '../../src/scene/mock-objects';

const doc = createWorldScene(), seen = new Set();
const assets = doc.objects.filter(object => {
  const key = object.spec?.displayName ?? object.kind;
  if (seen.has(key)) return false;
  seen.add(key); return true;
});
for(const spec of [...inventionExamples,...dreamExamples,...interactiveWorld.assemblies]) if(!seen.has(spec.displayName)) { seen.add(spec.displayName);assets.push({id:spec.displayName,kind:'custom',labelText:spec.displayName,x:3000,y:2400,scale:measuredScale(spec),spec}); }
assets.push({ id: 'player', kind: 'custom', labelText: 'Player', x: 3000, y: 2400, scale: 1, spec: mockCar });
const select = document.querySelector('#asset'), view = document.querySelector('#view');
const motion = document.querySelector('#motion'), canvas = document.querySelector('canvas');
assets.forEach((object, index) => select.add(new Option(object.spec?.displayName ?? object.kind, String(index))));
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setScissorTest(true);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const left = new THREE.Scene(), right = new THREE.Scene();
let source, batched, runtimeActor=false, center, size = 80, enabled = true, time = 0;
for (const scene of [left, right]) {
  scene.background = new THREE.Color('#52714d');
  scene.add(new THREE.HemisphereLight('#bad4e2', '#384736', 1.25));
  const sun = new THREE.DirectionalLight('#ffe5b8', 2.4);
  sun.position.set(-300, 690, 220); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.normalBias = .2;
  Object.assign(sun.shadow.camera, { left: -180, right: 180, top: 180, bottom: -180, far: 1200 });
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ color: '#52714d' }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
}
function dispose(group) {
  if (!group) return;
  group.removeFromParent();
  const geometries = new Set(), materials = new Set();
  group.traverse(part => {
    if (!(part instanceof THREE.Mesh)) return;
    geometries.add(part.geometry);
    for (const material of Array.isArray(part.material) ? part.material : [part.material]) materials.add(material);
    if (part.customDepthMaterial) materials.add(part.customDepthMaterial);
  });
  geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
}
function change() {
  dispose(source); dispose(batched);
  const object = { ...assets[Number(select.value)], x: doc.canonical.width/2, y: doc.canonical.height/2, scale: assets[Number(select.value)].scale };
  source = buildObject(object); source.position.y = 1.5; left.add(source);
  const spec = object.spec;
  const still = spec && 'dslVersion' in spec ? { ...spec, body: { ...spec.body, interaction: 'solid' } } : spec;
  const scene = parseScene({ ...doc, sports:[],sites:[],terrain: { hills: [] }, objects: [{ ...object, spec: still }] });
  runtimeActor=hasAnimatedJoints(still) || isActor(object) || isReactive(still);
  batched = runtimeActor ? buildObject(object) : new WorldScenery(scene).group;
  if(runtimeActor) batched.position.y=1.5;
  right.add(batched);
  document.querySelector('#runtime-label').textContent=runtimeActor ? 'Live assembly' : 'Instanced world assembly';
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source), dimensions = bounds.getSize(new THREE.Vector3());
  center = bounds.getCenter(new THREE.Vector3()); size = Math.max(...dimensions.toArray()) * .75;
  document.querySelector('#state').textContent = JSON.stringify({ asset: object.labelText, sourceSize: dimensions.toArray(), batches: batched.children.length });
}
select.onchange = change;
motion.onclick = () => { enabled = !enabled; motion.textContent = enabled ? 'Pause animation' : 'Resume animation'; };
document.querySelector('#phase').onchange = event => {
  time = Number(event.target.value); enabled = false; motion.textContent = 'Resume animation';
};
change();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 3000);
let previous = performance.now();
new ResizeObserver(() => renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)).observe(canvas);
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min(.1, (now - previous) / 1000); previous = now;
  if (enabled) time += dt;
  worldTime.value = time; worldMotion.value = 1; animateObject(source, time, true, 0);if(runtimeActor) animateObject(batched,time,true,0);
  const width = canvas.clientWidth, height = canvas.clientHeight, angle = Number(view.value);
  const aspect = width / height / 2, half = Math.max(size, size / aspect);
  Object.assign(camera, { left: -half * aspect, right: half * aspect, top: half, bottom: -half });
  camera.updateProjectionMatrix();
  camera.position.copy(center).add(new THREE.Vector3(110 * Math.cos(angle) + 150 * Math.sin(angle), 120, 150 * Math.cos(angle) - 110 * Math.sin(angle)));
  camera.lookAt(center);
  for (const [index, scene] of [left, right].entries()) {
    renderer.setViewport(index * width / 2, 0, width / 2, height);
    renderer.setScissor(index * width / 2, 0, width / 2, height); renderer.render(scene, camera);
  }
});
