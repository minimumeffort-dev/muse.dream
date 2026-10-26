import {beforeAll,expect,it} from 'vitest';
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=(path:string)=>readFileSync(new URL(path,new URL('../',import.meta.url)),'utf8');
const exists=(path:string)=>existsSync(new URL(path,new URL('../',import.meta.url)));
import {compileDreamWorld} from '../src/engine/scene/dream';

beforeAll(()=>{execFileSync(process.execPath,['render-variants.mjs'],{cwd:root});});

it('renders the live workspace and archived alternatives with embedded fonts',()=>{
  const structures=['workspace-layout','notebook-layout','compare-layout'];
  ['workspace','notebook','compare'].forEach((name,i)=>{
    const html=read(`design/${name}.html`);
    expect(html).toContain(`class="${structures[i]}"`);
    if(name==='workspace'){
      const bodyText=html.slice(html.indexOf('<body')).replace(/<[^>]*>/g,'');
      expect(bodyText).not.toMatch(/\b(demo|illustrative|sample|prototype|preview|mock)\b/i);
      expect(html).not.toContain('aria-label="Design variants"');
      expect(html).toContain('aria-label="Provider: local mock"');
      expect(html).toContain('<summary>Dream source</summary>');
    }else expect(html).toContain('Design preview · illustrative data · no model calls or simulation');
    expect(html).toContain('data:font/woff2;base64,');
    expect(html).not.toMatch(/<iframe\b|src="https?:/);
    if(name==='workspace')expect(html).toContain('<script type="module" src="/src/main.ts"></script>');
    else expect(html).not.toContain('<script');
    expect(html.includes(name==='workspace'?'id="play"':name==='notebook'?'aria-label="Run experiment" disabled':'aria-label="Play" disabled')).toBe(true);
    expect(html.split('\n').length).toBeLessThan(200);
    for(const [,href] of html.matchAll(/href="([^"#][^"]*)"/g)){
      if(href!.startsWith('https:'))continue;
      expect(existsSync(new URL(href!,new URL(`../design/${name}.html`,import.meta.url)))).toBe(true);
    }
  });
  expect(read('index.html')).toBe(read('design/workspace.html'));
});

it('shows an example accepted by the canonical Dream compiler without introducing a language fork',()=>{
  const source=read('design/example.dream');
  const result=compileDreamWorld(source);
  expect(result.scenarios).toHaveLength(1);
  expect(result.scenarios[0]!.objectives[0]).toMatchObject({agent:'courier_a',kind:'deliver',quantity:2});
  expect(result.assemblies).toEqual([]);
  expect(result.layout).toBeUndefined();
});

it('keeps design review options linked to the actual generated previews',()=>{
  const review=JSON.parse(read('design-review.json'));
  expect(review.options.map((o:{id:string})=>o.id)).toEqual(['workspace','notebook','compare']);
  for(const option of review.options){
    expect(exists(option.html)).toBe(true);
    expect(exists(option.comp)).toBe(true);
  }
  const packageJson=JSON.parse(read('package.json'));
  expect(packageJson.scripts.dev).toContain('vite --config vite.config.ts');
});
