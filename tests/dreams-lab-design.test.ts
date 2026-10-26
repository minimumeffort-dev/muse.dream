import {beforeAll,expect,it} from 'vitest';
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {compileDreamWorld} from '../src/scene/dream';

beforeAll(()=>{execFileSync(process.execPath,['dreams-lab/render-variants.mjs']);});

it('renders three self-contained, distinctly structured previews without runtime or external font dependencies',()=>{
  const structures=['workspace-layout','notebook-layout','compare-layout'];
  ['workspace','notebook','compare'].forEach((name,i)=>{
    const html=readFileSync(`dreams-lab/design/${name}.html`,'utf8');
    expect(html).toContain(`class="${structures[i]}"`);
    expect(html).toContain('Design preview · illustrative data · no model calls or simulation');
    expect(html).toContain('data:font/woff2;base64,');
    expect(html).not.toMatch(/<script\b|<iframe\b|src="https?:/);
    expect(html).toContain('disabled title="Design preview; simulation controls are not connected"');
    expect(html.split('\n').length).toBeLessThan(200);
    for(const [,href] of html.matchAll(/href="([^"#][^"]*)"/g)){
      if(href!.startsWith('https:'))continue;
      expect(existsSync(new URL(href!,new URL(`../dreams-lab/design/${name}.html`,import.meta.url)))).toBe(true);
    }
  });
});

it('shows an example accepted by the canonical Dream compiler without introducing a language fork',()=>{
  const source=readFileSync('dreams-lab/design/example.dream','utf8');
  const result=compileDreamWorld(source);
  expect(result.scenarios).toHaveLength(1);
  expect(result.scenarios[0]!.objectives[0]).toMatchObject({agent:'courier_a',kind:'deliver',quantity:2});
  expect(result.assemblies).toEqual([]);
  expect(result.layout).toBeUndefined();
});

it('keeps design review options linked to the actual generated previews',()=>{
  const review=JSON.parse(readFileSync('dreams-lab/design-review.json','utf8'));
  expect(review.options.map((o:{id:string})=>o.id)).toEqual(['workspace','notebook','compare']);
  for(const option of review.options){
    expect(existsSync(`dreams-lab/${option.html}`)).toBe(true);
    expect(existsSync(`dreams-lab/${option.comp}`)).toBe(true);
  }
  const packageJson=JSON.parse(readFileSync('package.json','utf8'));
  expect(packageJson.scripts['lab:design']).toContain('node dreams-lab/render-variants.mjs && vite dreams-lab');
});
