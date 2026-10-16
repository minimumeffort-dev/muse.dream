import { roadPoints } from "./road";
import { buildLoopMask, buildRibbonMask, type RasterMask } from "../sim/mask";
import { parseScene, type Scene } from "./schema";
import { mockCastle, mockMushroom, mockMushroomRover } from "./mock-objects";

/**
 * Hand-made fixture track (Slice 1): a rounded-rectangle loop on a 960x720
 * canonical "sheet of paper". Travel is counter-clockwise on screen:
 * east along the bottom, north up the right, west along the top, south
 * down the left. No photo, camera, or model call is involved.
 */
export const CANONICAL_WIDTH = 960;
export const CANONICAL_HEIGHT = 720;
export const CAR_RADIUS = 11;

const OUTER = { x: 90, y: 70, width: 780, height: 580, radius: 150 };
const ROAD_WIDTH = 118;

export function createFixtureScene(): Scene {
  return parseScene({
    schemaVersion: 1,
    sceneId: "fixture-rounded-loop",
    revisionId: "fixture-rounded-loop-r2",
    sourceHash: "fixture:rounded-loop-v2",
    canonical: {
      width: CANONICAL_WIDTH,
      height: CANONICAL_HEIGHT,
      coordinateSystem: "top-left-x-right-y-down-px",
    },
    roadMaskRef: {
      kind: "generated-rounded-rect-loop",
      params: { outer: OUTER, roadWidth: ROAD_WIDTH },
    },
    // Just past the start line on the bottom straight, heading east.
    spawn: { x: 525, y: 591, headingRad: 0 },
    checkpoints: [
      {
        id: "cp-start",
        a: { x: 480, y: 538 },
        b: { x: 480, y: 646 },
        dir: { x: 1, y: 0 },
      },
      {
        id: "cp-east",
        a: { x: 758, y: 360 },
        b: { x: 864, y: 360 },
        dir: { x: 0, y: -1 },
      },
      {
        id: "cp-north",
        a: { x: 480, y: 76 },
        b: { x: 480, y: 182 },
        dir: { x: -1, y: 0 },
      },
      {
        id: "cp-west",
        a: { x: 96, y: 360 },
        b: { x: 202, y: 360 },
        dir: { x: 0, y: 1 },
      },
    ],
    regions: [
      {
        id: "region-1-ice",
        labelText: "ICE",
        polygon: [
          { x: 385, y: 86 },
          { x: 575, y: 86 },
          { x: 575, y: 172 },
          { x: 385, y: 172 },
        ],
        rule: { effect: "ICE" },
      },
      {
        id: "region-2-boost",
        labelText: "BOOST",
        polygon: [
          { x: 764, y: 285 },
          { x: 864, y: 285 },
          { x: 864, y: 435 },
          { x: 764, y: 435 },
        ],
        rule: { effect: "BOOST" },
      },
    ],
    // Mock "detections": what a vision pass will later produce from a photo.
    objects: [
      { id: "obj-tire-1", kind: "tire-stack", labelText: "TIRES", x: 640, y: 591, scale: 1 },
      { id: "obj-tire-2", kind: "tire-stack", labelText: "TIRES", x: 149, y: 470, scale: 1 },
      { id: "obj-cone-1", kind: "cone", labelText: "CONE", x: 720, y: 620, scale: 1 },
      { id: "obj-cone-2", kind: "cone", labelText: "CONE", x: 812, y: 475, scale: 1 },
      { id: "obj-cone-3", kind: "cone", labelText: "CONE", x: 252, y: 130, scale: 1 },
      { id: "obj-cone-4", kind: "cone", labelText: "CONE", x: 150, y: 262, scale: 1 },
      { id: "obj-tree-1", kind: "tree", labelText: "TREE", x: 352, y: 302, scale: 1.2 },
      { id: "obj-tree-2", kind: "tree", labelText: "TREE", x: 618, y: 418, scale: 1 },
      { id: "obj-tree-3", kind: "tree", labelText: "TREE", x: 482, y: 282, scale: 0.85 },
      { id: "obj-tree-4", kind: "tree", labelText: "TREE", x: 46, y: 664, scale: 1.1 },
      { id: "obj-tree-5", kind: "tree", labelText: "TREE", x: 916, y: 52, scale: 0.95 },
      // Mock model inventions (data-only specs a vision model could emit):
      {
        id: "obj-invented-castle", kind: "custom", labelText: "CASTLE", x: 560, y: 460, scale: 1,
        spec: mockCastle,
      },
      {
        id: "obj-invented-mushroom", kind: "custom", labelText: "MUSHROOM", x: 300, y: 600, scale: 1,
        spec: mockMushroom,
      },
      {
        id: "obj-invented-rover", kind: "custom", labelText: "MUSHROOM ROVER", x: 420, y: 410, scale: 1.3,
        spec: mockMushroomRover,
      },
    ],
    unresolvedLabels: [],
    provenance: {
      source: "handmade-fixture",
      notes:
        "Programmatic stand-in for a rectified paper drawing; geometry and " +
        "labels authored in code so Slice 1 needs no camera or API.",
    },
  });
}

export function buildMaskForScene(scene: Scene): RasterMask {
  if (scene.roadMaskRef.kind === "generated-spline-loop") return buildRibbonMask(scene.canonical.width, scene.canonical.height, roadPoints(scene), scene.roadMaskRef.params.roadWidth);
  const { outer, roadWidth } = scene.roadMaskRef.params;
  return buildLoopMask(scene.canonical.width, scene.canonical.height, outer, roadWidth);
}
