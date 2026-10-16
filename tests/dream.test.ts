import { describe, expect, it } from "vitest";
import { Box3, InstancedMesh, Matrix4, Mesh, Vector3 } from "three";
import source from "../src/scene/dream-creations.dream?raw";
import guide from "../docs/dream-language.md?raw";
import { compileDream, DreamError, DREAM_LIMITS } from "../src/scene/dream";
import { dreamExamples } from "../src/scene/dream-creations";
import { objectDslSchema } from "../src/scene/object-dsl";
import { buildObject, animateObject } from "../src/game/world3d";
import { WorldScenery } from "../src/game/scenery";
import { createFixtureScene } from "../src/scene/fixture";
import { createWorldScene } from "../src/scene/world-fixture";
import { parseScene, type SceneObject } from "../src/scene/schema";
import { objectPlacement } from "../src/scene/placement";

const header = "dream 1; material red = toon #bb5544;";
const body = "body solid radius 12 height 40;";
const part = "part block box red at [0,5,0] size [10,10,10];";
const compile = (block: string, declarations = "") => compileDream(`${header} ${declarations} object "Test" { ${body} ${block} }`)[0]!;
const object = (spec = compile(part)): SceneObject => ({ id: "dream", kind: "custom", labelText: "Dream", x: 480, y: 360, scale: 1, spec });

describe("Dream authoring language", () => {
  it("compiles comments, palettes, arithmetic precedence and scoped numbers to strict v2 data", () => {
    const spec = compile(`
      // Minus needs no surrounding whitespace; trig uses degrees.
      let x = 2+3*4;
      part first sphere red at [x-1, (2+3)*2, -cos(180)] size [6/2, 4, +5];
      group at [10,0,0] { let x = 2; part child box red at [x,3,0] size [2,2,2]; }
      part last box red at [x,3,0] size [2,2,2];
    `);
    expect(spec.parts.map(p => p.position)).toEqual([[13,10,1],[12,3,0],[14,3,0]]);
    expect(spec.parts[0]!.size).toEqual([3,4,5]);
    expect(spec.parts[0]!.material).toEqual({ shaderStyle: "toon", colorA: "#bb5544", colorB: "#bb5544" });
    expect(objectDslSchema.parse(JSON.parse(JSON.stringify(spec)))).toEqual(spec);
  });
  it("reuses parameterized components with lexical scope and deterministic unique IDs", () => {
    const declarations = `let height = 10; component post(h) { ${part.replace("[10,10,10]", "[2,h,height]")} }`;
    const block = `let height = 50; repeat i 2 { use post(6+i) at [i*12,0,0]; }`;
    const spec = compile(block, declarations);
    expect(spec).toEqual(compile(block, declarations));
    expect(spec.parts.map(p => p.size)).toEqual([[2,6,10],[2,7,10]]);
    expect(spec.parts.map(p => p.position)).toEqual([[0,5,0],[12,5,0]]);
    expect(new Set(spec.parts.map(p => p.id)).size).toBe(2);
    expect(spec.parts[0]!.material).not.toBe(spec.parts[1]!.material);
  });
  it("bakes rigid group transforms and uniform scale before creating a joint frame", () => {
    const spec = compile(`group at [10,0,0] rotate [0,0,90] scale 2 {
      joint elbow at [0,5,0] swing z (20,2,-30) {
        part hand capsule red at [0,3,0] size [2,4,2];
      }
    }`);
    const joint = spec.joints![0]!, p = spec.parts[0]!;
    expect(joint.position[0]).toBeCloseTo(0, 10); expect(joint.position[1]).toBeCloseTo(0, 10);
    expect(joint.animation!.phase).toBeCloseTo(-Math.PI/6);
    expect(p.parent).toBe(joint.id); expect(p.position).toEqual([0,6,0]); expect(p.size).toEqual([4,8,4]);
    const group = buildObject(object(spec)); group.updateMatrixWorld(true);
    const mesh = group.getObjectByName(p.id)!;
    const before = mesh.getWorldScale(new Vector3());
    expect(mesh.getWorldPosition(new Vector3()).x).toBeCloseTo(-6, 8);
    animateObject(group, 1); group.updateMatrixWorld(true);
    expect(mesh.getWorldScale(new Vector3()).distanceTo(before)).toBeLessThan(1e-9);
    expect(mesh.getWorldPosition(new Vector3()).distanceTo(new Vector3(-6,0,0))).toBeGreaterThan(.1);
  });
  it.each([
    [[-10,5,2],[17,32,-9]], [[0,0,0],[0,-20,0]], [[0,0,0],[0,20,0]],
  ])("puts both beam ends on the requested endpoints: %j to %j", (a, b) => {
    const spec = compile(`beam strut box red from [${a}] to [${b}] width 3 depth 4;`), p = spec.parts[0]!;
    const group = buildObject(object(spec)); group.updateMatrixWorld(true);
    const mesh = group.getObjectByName(p.id)!;
    const start = mesh.localToWorld(new Vector3(0,-.5,0)), end = mesh.localToWorld(new Vector3(0,.5,0));
    expect(start.distanceTo(new Vector3(...a))).toBeLessThan(1e-9);
    expect(end.distanceTo(new Vector3(...b))).toBeLessThan(1e-9);
  });
  it("converts angles and motions to radians and scales wheel rolling distance", () => {
    const spec = compile(`group scale 2 {
      part wheel cylinder red at [0,5,0] size [8,3,8] rotate [90,0,0] roll 4;
      part rotor box red at [0,20,0] size [10,2,2] spin z -90;
      part leaf box red at [0,15,0] size [4,4,2] sway (5,1.5);
    }`);
    expect(spec.parts[0]!.rotation![0]).toBeCloseTo(Math.PI/2);
    expect(spec.parts.map(p => p.animation)).toEqual([
      { kind:"roll", radius:8 }, { kind:"spin",axis:"z",speed:-Math.PI/2 },
      { kind:"sway",amplitudeRad:5*Math.PI/180,speed:1.5 },
    ]);
  });
  it("creates all seven new silhouettes in the playable world through the same validated contract", () => {
    const scene = createWorldScene();
    expect(dreamExamples).toHaveLength(7);
    for (const spec of dreamExamples) {
      expect(objectDslSchema.parse(spec)).toEqual(spec);
      expect(scene.objects.filter(o => o.spec?.displayName === spec.displayName), spec.displayName).toHaveLength(1);
      const group = buildObject(object(spec));
      const bounds = new Box3().setFromObject(group);
      expect(bounds.isEmpty(), spec.displayName).toBe(false);
      group.traverse(child => { if (child instanceof Mesh) child.geometry.dispose(); });
    }
    expect(compileDream(source)).toEqual(dreamExamples);
  });
  it("instances static Dream objects with the same geometry bounds as the source assembly", () => {
    for (const spec of dreamExamples.filter(s => !s.joints?.some(j => j.animation))) {
      const item = object({ ...spec, body:{ ...spec.body, interaction:"solid" } });
      const scene = parseScene({ ...createFixtureScene(), terrain:{ hills:[] }, objects:[item] });
      const sourceGroup = buildObject(item), scenery = new WorldScenery(scene).group;
      sourceGroup.position.y = objectPlacement(scene,item).base + 1.5;
      // Physical interaction is independent of geometry; props use the live builder in play.
      const a = new Box3().setFromObject(sourceGroup, true), b = new Box3(); scenery.updateMatrixWorld(true);
      scenery.traverse(child => {
        if (!(child instanceof InstancedMesh)) return;
        const vertices = child.geometry.getAttribute("position"), matrix = new Matrix4();
        for (let i = 0; i < child.count; i++) {
          child.getMatrixAt(i, matrix); matrix.premultiply(child.matrixWorld);
          for (let v = 0; v < vertices.count; v++) b.expandByPoint(new Vector3().fromBufferAttribute(vertices,v).applyMatrix4(matrix));
        }
      });
      expect(b.max.y, spec.displayName).toBeCloseTo(a.max.y, 3);
    }
  });
  it("is measurably smaller than its expanded JSON, including its comments and palette", () => {
    expect(source.length).toBeLessThan(JSON.stringify(dreamExamples).length * .65);
  });
  it("keeps the documented starter example compilable", () => {
    const example = guide.match(/```text\n([\s\S]*?)```/)![1]!;
    const spec = compileDream(example)[0]!;
    expect(spec.parts).toHaveLength(5); expect(spec.displayName).toBe("Small table");
  });
});

describe("Dream input rejection", () => {
  it.each([
    ["unknown symbol", "part x sphere red at [missing,2,0] size [2,2,2];", "unknown number"],
    ["non-finite", "let x=1/0;", "finite"],
    ["too large", "let x=1e7;", "finite"],
    ["unknown function", "let x=fetch(1);", "unknown numeric function"],
    ["unknown shape", "part x mesh red at [0,2,0] size [2,2,2];", "Invalid enum"],
    ["unknown material", "part x sphere blue at [0,2,0] size [2,2,2];", "unknown material"],
    ["part overflow", `repeat i 32 { ${part} } ${part}`, "part budget"],
    ["joint overflow", "repeat i 13 { joint node { part p box red at [0,2,0] size [2,2,2]; } }", "joint budget"],
    ["joint depth", "joint a { joint b { joint c { joint d { joint e { part p box red at [0,2,0] size [2,2,2]; } } } } }", "four levels"],
    ["repeat bound", `repeat i 33 { ${part} }`, "integer from 0 to 32"],
    ["fractional repeat", `repeat i 1.5 { ${part} }`, "integer from 0 to 32"],
    ["nested repeat work", `repeat i 32 { repeat j 32 { repeat k 32 { let x=1; } } } ${part}`, "expansion budget"],
    ["bad endpoints", "beam a box red from [0,0,0] to [0,0,0] width 2 depth 2;", "endpoints"],
    ["unsupported beam", "beam a torus red from [0,0,0] to [0,10,0] width 2 depth 2;", "beam shape"],
    ["bad deformation", "part p box red at [0,2,0] size [2,2,2] deform (1,.9);", "less than or equal to 0.24"],
    ["invalid motion", "joint a swing q (20,1,0) { part p box red at [0,2,0] size [2,2,2]; }", "Invalid enum"],
    ["negative scale", `group scale -1 { ${part} }`, "combined scale"],
    ["metadata in expansion", `group { body solid radius 12 height 10; ${part} }`, "directly inside"],
    ["duplicate metadata", `${body} ${part}`, "duplicate body"],
    ["duplicate local", "let a=1; let a=2;", "duplicate local"],
    ["grounding conflict", `ground surface; foundation [30,20] #777777; ${part}`, "stay upright"],
    ["trailing option", "part x box red at [0,2,0] size [2,2,2] texture \"https://x.test\";", "unexpected part option"],
    ["unterminated block", "group {", "unknown statement"],
  ])("rejects %s", (_, block, message) => expect(() => compile(block)).toThrow(message));
  it.each([
    ["component a() { use a(); }", "use a();", "recursive component"],
    ["component a() { use b(); } component b() { use a(); }", "use a();", "recursive component"],
    ["component a(h) { part x box red at [0,2,0] size [2,h,2]; }", "use a();", "expects 1"],
    ["", "use missing();", "unknown component"],
    ["material x = arbitrary #112233;", part, "material style"],
    ["let x=1; let x=2;", part, "duplicate definition"],
  ])("rejects invalid definitions %s", (declarations, block, message) => expect(() => compile(block, declarations)).toThrow(message));
  it("reports the original source line and column for syntax and validation errors", () => {
    expect(() => compileDream("dream 1;\nobject \"Bad\" {\n body solid radius 12 height 20;\n part a box missing at [0,1,0] size [2,2,2];\n}")).toThrow("Dream 4:2: unknown material");
    expect(() => compileDream("dream 1;\nmaterial a = toon #123456;\nobject \"Bad\" { body solid radius 12 height 20;\n part a box a at [0,1,0] size [200,2,2];\n}")).toThrow("Dream 4:2: Bad: parts.0.size.0");
    expect(() => compileDream("dream 2;")).toThrow(DreamError);
  });
  it("bounds source, tokens, expressions, blocks, objects and empty expansions", () => {
    expect(() => compileDream(null as unknown as string)).toThrow("source must be text");
    expect(() => compileDream(" ".repeat(DREAM_LIMITS.characters+1))).toThrow("characters");
    expect(() => compileDream(";".repeat(DREAM_LIMITS.tokens+1))).toThrow("token budget");
    expect(() => compile(`let x=${"(".repeat(40)}1${")".repeat(40)};`)).toThrow("expression nesting");
    expect(() => compile(`${"group {".repeat(20)}${part}${"}".repeat(20)}`)).toThrow("block nesting");
    expect(() => compileDream(`${header} ${Array.from({length:17},(_,i)=>`object "${i}" { ${body} ${part} }`).join(" ")}`)).toThrow("object budget");
    expect(() => compile(`repeat i 0 { ${part} }`)).toThrow("at least 1 element");
  });
  it("rejects executable syntax and produces no partial result when a later object is invalid", () => {
    for (const text of ["eval('x');", "while (1) {}", "import x from 'url';", "part x box red at [0,1,0] size [2,2,2] shader { gl_FragColor=1; };", "let x = globalThis;"])
      expect(() => compile(text)).toThrow(DreamError);
    expect(() => compileDream(`${header} object "Good" { ${body} ${part} } object "Bad" { ${part} }`)).toThrow("needs a body");
  });
});
