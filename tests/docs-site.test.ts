import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {highlightDream} from '../docs/site/dream-highlight.mjs';
import {DREAM_V2_COMMANDS} from '../src/scene/dream-contract';

const highlight=(source:string)=>highlightDream(source,DREAM_V2_COMMANDS);
describe('Dream syntax highlighting',()=>{
  it('preserves every character and protects HTML in strings and comments',()=>{
    const source='// part "<script>"\r\ndream 2;\nobject oak(label="<img onerror=bad>&") { part trunk(size=[-1,.5,2e-3],material=bark); }';
    const html=highlight(source);
    expect(html).not.toContain('<script>');expect(html).not.toContain('<img');
    const restored=html.replace(/<[^>]+>/g,'').replace(/&(?:amp|lt|gt|quot|#39);/g,s=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[s]!));
    expect(restored).toBe(source);
    expect(html).toContain('<span class="dream-comment">// part &quot;&lt;script&gt;&quot;</span>');
    expect(html).toContain('<span class="dream-string">&quot;&lt;img onerror=bad&gt;&amp;&quot;</span>');
  });
  it('distinguishes commands, fields, numeric expressions, colors, references and booleans',()=>{
    const html=highlight('part crown(shape=icosphere,material=leaf,at=[-1,.2,3e2],taper=.6); material leaf(colors=[#77a05b,#426b45]); bridge b(rails=true);');
    for(const [kind,value] of [['keyword','part'],['field','material'],['field','taper'],['number','.2'],['number','3e2'],['color','#77a05b'],['symbol','leaf'],['boolean','true']])
      expect(html).toContain(`<span class="dream-${kind}">${value}</span>`);
  });
  it('tracks the generated compiler vocabulary',()=>{
    const contract=JSON.parse(readFileSync('docs/dream-v2-contract.json','utf8'));
    expect(Object.keys(contract.commands)).toEqual(Object.keys(DREAM_V2_COMMANDS));
    for(const command of Object.keys(contract.commands))expect(highlight(command+'()')).toContain(`class="dream-keyword">${command}</span>`);
  });
});

describe('published site',()=>{
  it('builds highlighted source with project-relative navigation and working downloads',()=>{
    execFileSync(process.execPath,['scripts/docs.mjs']);
    const html=readFileSync('dist-docs/dream/examples.html','utf8');
    expect(html).toContain('class="dream-keyword">impact</span>');
    expect(html).toContain('href="../examples/bouncing-ball.dream"');
    expect(html).toContain('href="../index.html"');
    expect(html).toContain('aria-label="Copy code"');
    expect(existsSync('dist-docs/examples/swinging-sign.dream')).toBe(true);
    const home=readFileSync('dist-docs/index.html','utf8');
    expect(home).toContain('href="dream/quickstart.html"');
    expect(home).toContain('src="media/code-to-tree.jpg"');
    for(const file of readdirSync('dist-docs',{recursive:true,encoding:'utf8'}).filter(f=>f.endsWith('.html'))){
      const page=readFileSync('dist-docs/'+file,'utf8');
      for(const match of page.matchAll(/(?:href|src)="([^"#][^"]*)"/g)){
        const url=new URL(match[1]!,`https://docs.local/${file}`);
        if(url.origin!=='https://docs.local')continue;
        expect(existsSync('dist-docs'+url.pathname),`${file}: ${url.pathname}`).toBe(true);
      }
    }
  });
  it('keeps the example guide identical to the runnable files',()=>{
    const readme=readFileSync('README.md','utf8');
    expect(readme.match(/```dream\n([\s\S]*?)```/)![1]!.trim()).toBe(readFileSync('docs/examples/toppling-tree.dream','utf8').trim());
    const page=readFileSync('docs/dream/examples.md','utf8');
    const blocks=[...page.matchAll(/```dream\n([\s\S]*?)```/g)].map(m=>m[1]!.trim());
    for(const name of ['bouncing-ball','breakable-bench','swinging-sign','toppling-tree'])
      expect(blocks).toContain(readFileSync(`docs/examples/${name}.dream`,'utf8').trim());
  });
});
