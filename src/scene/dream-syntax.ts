import { objectMaterialSchema, type ObjectMaterial } from "./object-dsl";

// Source is compiled once into bounded data. No source text reaches the renderer.
export const DREAM_LIMITS = Object.freeze({ characters: 65536, tokens: 12000, nesting: 16, steps: 2048, objects: 16, repeat: 32 });
export type Token = { text: string; line: number; column: number; path?: string };
export type Expr = { token: Token; value?: number; name?: string; op?: string; args?: Expr[] };
export type Vec = [Expr, Expr, Expr];
export type Transform = { at?: Vec; rotate?: Vec; scale?: Expr };
export type Motion = { kind: "spin" | "roll" | "sway" | "swing" | "open"; axis?: string; args: Expr[] };
export type Statement = {
  token: Token; kind: string; scope?: string; name?: string; shape?: string; material?: string;
  value?: Expr; args?: Expr[]; at?: Vec; size?: Vec; to?: Vec; rotate?: Vec; scale?: Expr;
  taper?: Expr; outline?:[Expr,Expr][]; deform?: [Expr, Expr]; motion?: Motion; block?: Statement[]; interaction?: string; color?: string;
  site?:string;pattern?:string;axis?:string;control?:string;damage?:{kind:string;args:Expr[];pattern?:string};
};
export type Component = { token: Token; params: string[]; block: Statement[] };
export type RouteSource={token:Token;name:string;kind:string;mode:string;speed:Expr;altitude?:Expr;wait?:Expr;width?:Expr;surface?:string;gauge?:Expr;block:Statement[]};
export type PlaceSource={token:Token;name:string;assembly:string;at?:Expr[];route?:string;offset?:Expr;phase?:Expr;scale?:Expr;heading?:Expr;role?:'prop'|'npc'|'controllable';behavior?:string};
export type WaterSource={ends?:"round"|"open";token:Token;name:string;level:Expr;depth:Expr;bank:Expr;color:string;flow:Expr[];block:Statement[]};
export type Program = {
  version: 1 | 2; layout: DreamNode[]; nodes?: DreamNode[]; assets?: DreamNode[]; includes?: DreamNode[];
  materials: Map<string, ObjectMaterial>; components: Map<string, Component>;
  globals: Statement[]; objects: { token: Token; name: string; id?: string; block: Statement[] }[];
  routes:RouteSource[];places:PlaceSource[];waters:WaterSource[];
};

export type DreamValue = Expr | string | boolean | DreamValue[] | DreamNode;
export type DreamNode = { kind: string; id?: string; token: Token; fields: Map<string, DreamValue>; block?: DreamNode[] };
export type DreamDiagnostic = { code: string; line: number; column: number; path: string; message: string; expected?: string[]; module?: string };

export class DreamError extends Error {
  readonly diagnostic: DreamDiagnostic;
  constructor(message: string, token: Token = { text: "", line: 1, column: 1 }, code = "E_COMPILE", expected?: string[]) {
    super(`Dream ${token.line}:${token.column}: ${message}`); this.name = "DreamError";
    this.diagnostic = { code, line: token.line, column: token.column, path: token.path ?? "source", message, ...(expected ? { expected } : {}) };
  }
  toJSON(): DreamDiagnostic { return this.diagnostic; }
}
export function fail(message: string, token?: Token, code?: string, expected?: string[]): never {
  throw new DreamError(message, token, code, expected);
}

export function lex(source: string): Token[] {
  if (typeof source !== "string") fail("source must be text");
  if (source.length > DREAM_LIMITS.characters) fail("source exceeds 65536 characters",undefined,"E_BUDGET");
  const tokens: Token[] = []; let line = 1, column = 1;
  const pattern = /\s+|\/\/[^\n]*|"(?:[^"\\\r\n]|\\.)*"|#[0-9a-fA-F]{6}\b|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z_][A-Za-z_0-9]*|[{}()[\],;=+*/-]/y;
  for (let offset = 0; offset < source.length;) {
    pattern.lastIndex = offset; const match = pattern.exec(source);
    if (!match) fail(`unexpected character ${JSON.stringify(source[offset])}`, { text: "", line, column },"E_LEX");
    const text = match[0]!;
    if (!/^\s|^\/\//.test(text)) tokens.push({ text, line, column });
    if (tokens.length > DREAM_LIMITS.tokens) fail("token budget exceeded", tokens.at(-1),"E_BUDGET");
    for (const char of text) { if (char === "\n") { line++; column = 1; } else column++; }
    offset += text.length;
  }
  tokens.push({ text: "<end>", line, column }); return tokens;
}

export class Parser {
  protected index = 0;
  constructor(protected tokens: Token[]) {}
  protected get token() { return this.tokens[this.index]!; }
  protected take() { const token = this.token; if (token.text !== "<end>") this.index++; return token; }
  protected is(text: string) { return this.token.text === text; }
  protected accept(text: string) { if (!this.is(text)) return false; this.take(); return true; }
  protected expect(text: string) { if (!this.accept(text)) fail(`expected '${text}', found '${this.token.text}'`, this.token,"E_SYNTAX",[text]); }
  protected name() { const token = this.take(); if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(token.text)) fail("expected a name", token); return token.text; }
  protected color() { const token = this.take(); if (!/^#[0-9a-fA-F]{6}$/.test(token.text)) fail("expected a six-digit hex color", token); return token.text; }
  protected label() {const token=this.take();let value:unknown;try{value=JSON.parse(token.text);}catch{fail("expected a quoted object name",token);}if(typeof value!=="string")fail("expected a quoted object name",token);return value;}
  protected list() {const values:Expr[]=[];this.expect("[");do{values.push(this.expr());}while(this.accept(","));this.expect("]");if(values.length<2 || values.length>3)fail("points need two or three coordinates",this.token);return values;}
  protected expr(min = 0, depth = 0): Expr {
    if (depth > 32) fail("expression nesting exceeds 32", this.token,"E_BUDGET");
    const token = this.take(); let left: Expr;
    if (token.text === "-" || token.text === "+") left = { token, op: `unary${token.text}`, args: [this.expr(3, depth + 1)] };
    else if (token.text === "(") { left = this.expr(0, depth + 1); this.expect(")"); }
    else if (/^(\d|\.)/.test(token.text)) left = { token, value: Number(token.text) };
    else if (/^[A-Za-z_]/.test(token.text) && token.text !== "<end>") {
      if (this.accept("(")) { left = { token, name: token.text, args: [this.expr(0, depth + 1)] }; this.expect(")"); }
      else left = { token, name: token.text };
    } else fail("expected a number or numeric expression", token);
    while (true) {
      const precedence = ["+", "-"].includes(this.token.text) ? 1 : ["*", "/"].includes(this.token.text) ? 2 : 0;
      if (!precedence || precedence <= min) break;
      const op = this.take(); left = { token: op, op: op.text, args: [left, this.expr(precedence, depth + 1)] };
    }
    return left;
  }
  protected vec(): Vec { this.expect("["); const x = this.expr(); this.expect(","); const y = this.expr(); this.expect(","); const z = this.expr(); this.expect("]"); return [x, y, z]; }
  protected transform(): Transform {
    const result: Transform = {};
    while (["at", "rotate", "scale"].includes(this.token.text)) {
      const key = this.take().text as keyof Transform;
      if (result[key]) fail(`duplicate '${key}'`, this.token);
      if (key === "scale") result.scale = this.expr(); else result[key] = this.vec();
    }
    return result;
  }
  protected motion(kind: Motion["kind"]): Motion {
    const axis = kind === "spin" || kind === "swing" || kind==="open" || kind==="roll" && ["x","y","z"].includes(this.token.text) ? this.name() : undefined;
    const count = kind === "swing" ? 3 : kind === "sway" || kind==="open" ? 2 : 1;
    if (count > 1) this.expect("(");
    const args = Array.from({ length: count }, (_, index) => { if (index) this.expect(","); return this.expr(); });
    if (count > 1) this.expect(")");
    return { kind, axis, args };
  }
  protected block(depth = 0): Statement[] {
    if (depth >= DREAM_LIMITS.nesting) fail("block nesting exceeds 16", this.token);
    this.expect("{"); const statements: Statement[] = [];
    while (!this.accept("}")) {
      const token = this.take(), kind = token.text; let statement: Statement = { token, kind };
      switch (kind) {
        case "let": statement.name = this.name(); this.expect("="); statement.value = this.expr(); break;
        case "ground": statement.name = this.name(); break;
        case "impact":
          statement.name=this.name();statement.args=[];
          for(const word of statement.name==="bounce" ? ["restitution","lift"] : statement.name==="break" ? ["speed","scatter","lift","spin","lifetime"] : []){this.expect(word);statement.args.push(this.expr());}
          if(!["bounce","break"].includes(statement.name))fail("impact chooses bounce or break",token);
          break;
        case "fragment":statement.name=this.name();statement.block=this.block(depth+1);break;
        case "rideable": if(this.accept("at"))statement.at=this.vec();break;
        case "contact": this.expect("at");statement.at=this.vec();this.expect("radius");statement.args=[this.expr()];this.expect("height");statement.args.push(this.expr());break;
        case "point": statement.args=this.list();break;
        case "emit":statement.name=this.name();this.expect("at");statement.at=this.vec();this.expect("rate");statement.value=this.expr();break;
        case "body":
          statement.interaction = this.name(); this.expect("radius"); statement.args = [this.expr()];
          this.expect("height"); statement.args.push(this.expr());
          if (this.accept("friction")) statement.args.push(this.expr()); break;
        case "foundation":
          this.expect("["); statement.args = [this.expr()]; this.expect(","); statement.args.push(this.expr()); this.expect("]"); statement.color = this.color(); break;
        case "repeat": statement.name = this.name(); statement.value = this.expr(); statement.block = this.block(depth + 1); break;
        case "use": {
          statement.name = this.name(); statement.args = []; this.expect("(");
          if (!this.accept(")")) { do { statement.args.push(this.expr()); } while (this.accept(",")); this.expect(")"); }
          Object.assign(statement, this.transform()); break;
        }
        case "group": case "joint":
          if (kind === "joint") statement.name = this.name();
          Object.assign(statement, this.transform());
          if (kind === "joint" && this.accept("swing")) statement.motion = this.motion("swing");
          if (kind === "joint" && !statement.motion && this.accept("open")) statement.motion=this.motion("open");
          if (kind === "joint" && statement.scale) fail("use a surrounding group to scale an assembly", token);
          statement.block = this.block(depth + 1); break;
        case "part": case "beam":
          statement.name = this.name(); statement.shape = this.name(); statement.material = this.name();
          if (kind === "part") { this.expect("at"); statement.at = this.vec(); this.expect("size"); statement.size = this.vec(); }
          else {
            this.expect("from"); statement.at = this.vec(); this.expect("to"); statement.to = this.vec();
            this.expect("width"); statement.args = [this.expr()]; this.expect("depth"); statement.args.push(this.expr());
          }
          while (!this.is(";")) {
            const option = this.take();
            if (option.text === "rotate" && kind === "part" && !statement.rotate) statement.rotate = this.vec();
            else if (option.text === "deform" && !statement.deform) {
              this.expect("("); const seed = this.expr(); this.expect(","); statement.deform = [seed, this.expr()]; this.expect(")");
            }
            else if (["spin", "roll", "sway"].includes(option.text) && !statement.motion) statement.motion = this.motion(option.text as Motion["kind"]);
            else fail(`unexpected part option '${option.text}'`, option);
          } break;
        default: fail(`unknown statement '${kind}'`, token);
      }
      if (!statement.block) this.expect(";"); statements.push(statement);
    }
    return statements;
  }
  parse(): Program {
    this.expect("dream"); this.expect("1"); this.expect(";");
    const program: Program = { version: 1, layout: [], materials: new Map(), components: new Map(), globals: [], objects: [],routes:[],places:[],waters:[] };
    const names = new Set<string>();
    while (!this.is("<end>")) {
      const token = this.take();
      if(token.text==="route") {
        const name=this.name(),kind=this.name(),mode=this.name();this.expect("speed");const speed=this.expr();
        const altitude=this.accept("altitude") ? this.expr() : undefined,wait=this.accept("wait") ? this.expr() : undefined;
        program.routes.push({token,name,kind,mode,speed,altitude,wait,block:this.block()});
        if(program.routes.length>12)fail("route budget exceeds 12",token);
      } else if(token.text==="place") {
        const name=this.name(),assembly=this.label(),place:PlaceSource={token,name,assembly};
        if(this.accept("on")){place.route=this.name();if(this.accept("offset"))place.offset=this.expr();}
        else {this.expect("at");place.at=this.list();}
        if(this.accept("scale"))place.scale=this.expr();if(this.accept("heading"))place.heading=this.expr();this.expect(";");program.places.push(place);
        if(program.places.length>64)fail("placement budget exceeds 64",token);
      } else if(token.text==="watercourse") {
        const name=this.name();this.expect("level");const level=this.expr();this.expect("depth");const depth=this.expr();this.expect("bank");const bank=this.expr();
        this.expect("color");const color=this.color();this.expect("flow");const flow=this.list();program.waters.push({token,name,level,depth,bank,color,flow,block:this.block()});
        if(program.waters.length>8)fail("water budget exceeds 8",token);
      } else if (token.text === "object") {
        const name=this.label();
        if (program.objects.some(object => object.name === name)) fail(`duplicate object '${name}'`, token);
        program.objects.push({ token, name, block: this.block() });
        if (program.objects.length > DREAM_LIMITS.objects) fail("object budget exceeds 16", token);
      } else if (["let", "material", "component"].includes(token.text)) {
        const name = this.name(); if (names.has(name)) fail(`duplicate definition '${name}'`, token); names.add(name);
        if (token.text === "let") {
          this.expect("="); program.globals.push({ token, kind: "let", name, value: this.expr() }); this.expect(";");
        } else if (token.text === "material") {
          this.expect("="); const style = this.name(), shaderStyle = style === "grain" ? "paper-grain" : style, colorA = this.color();
          const colorB = this.is(";") ? colorA : this.color(); this.expect(";");
          const material = objectMaterialSchema.safeParse({ shaderStyle, colorA, colorB });
          if (!material.success) fail("material style must be toon, grain, glow, stripes or cloth", token);
          program.materials.set(name, material.data);
        } else {
          const params: string[] = []; this.expect("(");
          if (!this.accept(")")) { do { const param = this.name(); if (params.includes(param)) fail(`duplicate parameter '${param}'`, token); params.push(param); } while (this.accept(",")); this.expect(")"); }
          program.components.set(name, { token, params, block: this.block() });
        }
      } else fail(`unknown declaration '${token.text}'`, token);
    }
    if (!program.objects.length) fail("expected at least one object", this.token);
    return program;
  }
}

