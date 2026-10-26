import {it,expect} from 'vitest';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,existsSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,relative} from 'node:path';
import {escapeHtml,highlightDream} from '../docs/site/dream-highlight.mjs';
import {DREAM_V2_COMMANDS} from '../src/engine/scene/dream-contract';

const root=fileURLToPath(new URL('../',import.meta.url));
const files=(directory:string):string[]=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(resolve(directory,entry.name)):[resolve(directory,entry.name)]);

it('builds only current Lab guides, fonts and source examples with working local links',()=>{
  execFileSync(process.execPath,['scripts/docs.mjs'],{cwd:root});
  const output=resolve(root,'dist-docs'),generated=files(output),pages=generated.filter(file=>file.endsWith('.html'));
  expect(pages.length).toBeGreaterThanOrEqual(3);
  expect(generated.some(file=>/\.(png|jpe?g|gif|mp4|webm|jsonl)$/i.test(file))).toBe(false);
  expect(generated.some(file=>/(?:^|\/)(media|evidence)(?:\/|$)/.test(file))).toBe(false);
  expect(existsSync(resolve(output,'examples/morning-delivery.dream'))).toBe(true);
  expect(existsSync(resolve(output,'examples/classroom.dream'))).toBe(true);
  expect(existsSync(resolve(output,'site/fonts/manrope-latin.woff2'))).toBe(true);
  expect(existsSync(resolve(output,'site/fonts/archivo-latin.woff2'))).toBe(true);
  const contract=resolve(root,'docs/language/dream-v2-contract.json');
  if(existsSync(contract)){
    expect(JSON.parse(readFileSync(contract,'utf8')).commands).toEqual(DREAM_V2_COMMANDS);
    expect(existsSync(resolve(output,'language/dream-v2-contract.json'))).toBe(true);
  }
  for(const page of pages){
    const html=readFileSync(page,'utf8');
    expect(html).toContain('Skip to content');expect(html).toContain('aria-label="Documentation"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    for(const match of html.matchAll(/<(?:a|link|script)\b[^>]*\b(?:href|src)="([^\"]+)"/g)){
      const href=match[1]!.replaceAll('&amp;','&');
      expect(href.split(/[?#]/)[0]).not.toMatch(/(?:^|\/)(?:media|evidence)(?:\/|$)|\.(?:png|jpe?g|gif|webp|mp4|webm|jsonl)$/i);
      if(/^(?:https?:|mailto:)/.test(href))continue;
      const [file,hash]=href.split('#'),target=file?resolve(dirname(page),file.split('?')[0]!):page;
      expect(relative(output,target).startsWith('..'),`${page}: ${href}`).toBe(false);
      expect(existsSync(target),`${page}: ${href}`).toBe(true);
      expect(statSync(target).isFile()).toBe(true);
      if(hash&&target.endsWith('.html'))expect(readFileSync(target,'utf8'),`${page}: ${href}`).toContain(`id="${hash}"`);
    }
  }
  const css=readFileSync(resolve(output,'site/style.css'),'utf8');
  for(const value of ['Manrope','Archivo','#fafaf7','#171717','#f7c843'])expect(css).toContain(value);
});

it('highlights compiler commands without splitting identifiers or changing source',()=>{
  const source='dream 2; object object_bread(label="bread // #ffeeaa"){ part shelf(size=[12.5,1e2,.5],faceted=true); } // object <tag>\n';
  const html=highlightDream(source,DREAM_V2_COMMANDS);
  expect(html).toContain('<span class="dream-keyword">object</span>');
  expect(html).toContain('<span class="dream-symbol">object_bread</span>');
  expect(html).toContain('<span class="dream-field">label</span>');
  expect(html).toContain('<span class="dream-boolean">true</span>');
  const plain=html.replace(/<[^>]*>/g,'').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
  expect(plain).toBe(source);
});

it('escapes markup in code strings and comments instead of emitting executable elements',()=>{
  const source='object x(label="<img src=x onerror=alert(1)>"); // <script>alert(1)</script> & "\n';
  const html=highlightDream(source,DREAM_V2_COMMANDS);
  expect(html).not.toContain('<img');expect(html).not.toContain('<script>');
  expect(html).toContain('&lt;img');expect(html).toContain('&lt;script&gt;');
  expect(escapeHtml('<script a="&">\'x\'</script>')).toBe('&lt;script a=&quot;&amp;&quot;&gt;&#39;x&#39;&lt;/script&gt;');
});
