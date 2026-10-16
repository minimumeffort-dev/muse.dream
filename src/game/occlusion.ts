import * as THREE from "three";

/** Fade just the scenery between the orthographic camera and the player's body. */
export class SceneryOcclusion {
  private ray = new THREE.Raycaster();
  private screen = new THREE.Vector3();
  private roots = new Map<THREE.Object3D, THREE.Group>();
  private materials = new Map<THREE.Group, Set<THREE.Material>>();
  obscuredCount = 0;

  constructor(private groups: THREE.Group[]) {
    for (const group of groups) {
      const materials = new Set<THREE.Material>();
      group.traverse((object) => {
        this.roots.set(object, group);
        if (object instanceof THREE.Mesh) {
          for (const mat of Array.isArray(object.material) ? object.material : [object.material]) materials.add(mat);
        }
      });
      this.materials.set(group, materials);
    }
  }

  update(camera: THREE.OrthographicCamera, player: THREE.Vector3, dt: number, snap = false, occupied?:THREE.Group): void {
    this.screen.copy(player).project(camera);
    this.ray.setFromCamera(new THREE.Vector2(this.screen.x, this.screen.y), camera);
    this.ray.far = this.ray.ray.origin.distanceTo(player) - 4;
    const obscuring = new Set(this.ray.intersectObjects(this.groups.filter(group=>group.visible && group!==occupied), true).map((hit) => this.roots.get(hit.object)));
    this.obscuredCount = obscuring.size;
    for (const [group, materials] of this.materials) {
      const target = obscuring.has(group) ? .22 : 1;
      for (const material of materials) {
        material.opacity += (target - material.opacity) * (snap ? 1 : 1 - Math.exp(-dt * 12));
        if (Math.abs(material.opacity - target) < .002) material.opacity = target;
        if (material.transparent !== (material.opacity < 1)) {
          material.transparent = material.opacity < 1;
          material.needsUpdate = true;
        }
        material.depthWrite = material.opacity > .99;
      }
    }
  }
}
