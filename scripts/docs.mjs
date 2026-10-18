import {readFile, readdir, mkdir, writeFile, cp, rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {marked} from 'marked';
import {highlightDream, escapeHtml} from '../docs/site/dream-highlight.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)), out=path.join(root,'dist-docs');
const contract=JSON.parse(await readFile(path.join(root,'docs/dream-v2-contract.json'),'utf8'));
const repo='https://github.com/minimumeffort-dev/muse.dream/blob/main/';
const files=['README.md','docs/media/README.md'];
async function walk(dir){for(const entry of await readdir(path.join(root,dir),{withFileTypes:true})){
  if(['evidence','media','site'].includes(entry.name))continue;
  const name=path.posix.join(dir,entry.name);
  if(entry.isDirectory())await walk(name);else if(name.endsWith('.md'))files.push(name);
}}
await walk('docs');
const outputName=name=>name==='docs/README.md'?'index.html':name==='README.md'?'overview.html':name.slice(5).replace(/\.md$/,'.html');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const dir of ['media','examples','site'])await cp(path.join(root,'docs',dir),path.join(out,dir),{recursive:true});
for(const name of ['dream-v2-contract.json','dream-v2-model.txt','dream-v2.ebnf'])await cp(path.join(root,'docs',name),path.join(out,name));
for(const file of files){
  const source=await readFile(path.join(root,file),'utf8'), destination=outputName(file), relative=target=>path.posix.relative(path.posix.dirname(destination),target)||'index.html';
  const link=href=>{
    if(!href || /^(?:https?:|mailto:|#)/.test(href))return href;
    const [pathname,hash]=href.split('#'), resolved=path.posix.normalize(path.posix.join(path.posix.dirname(file),pathname));
    const copied=resolved.startsWith('docs/') && /^(?:media|examples|site)\//.test(resolved.slice(5)) || ['docs/dream-v2-contract.json','docs/dream-v2-model.txt','docs/dream-v2.ebnf'].includes(resolved);
    const target=files.includes(resolved) ? relative(outputName(resolved)) : copied ? relative(resolved.slice(5)) : repo+resolved;
    return target+(hash?'#'+hash:'');
  };
  const renderer=new marked.Renderer(), slugs=new Map();
  renderer.code=({text,lang})=>`<div class="code-block"><div class="code-bar"><span>${escapeHtml(lang||'text')}</span><button type="button" aria-label="Copy code">Copy</button></div><pre tabindex="0"><code class="language-${escapeHtml(lang||'text')}">${lang==='dream'?highlightDream(text,contract.commands):escapeHtml(text)}</code></pre></div>`;
  renderer.link=function({href,title,tokens}){return `<a href="${escapeHtml(link(href))}"${title?` title="${escapeHtml(title)}"`:''}>${this.parser.parseInline(tokens)}</a>`;};
  renderer.image=({href,text})=>`<img src="${escapeHtml(link(href))}" alt="${escapeHtml(text)}" loading="lazy" decoding="async">`;
  renderer.heading=function({tokens,depth,text}){
    const slug=text.toLowerCase().replace(/<[^>]*>|[^\p{L}\p{N}_\-\s]/gu,'').trim().replace(/\s/g,'-'), count=slugs.get(slug)||0;slugs.set(slug,count+1);
    return `<h${depth} id="${slug}${count?'-'+count:''}">${this.parser.parseInline(tokens)}</h${depth}>`;
  };
  renderer.html=({text})=>escapeHtml(text);
  const title=source.match(/^# (.+)/m)?.[1]||'Dream 2';
  const groups=[['Start','docs/README.md'],['Quickstart','docs/dream/quickstart.md'],['Examples','docs/dream/examples.md'],['Objects','docs/dream/objects.md'],['Voxels','docs/dream/voxels.md'],['Worlds','docs/dream/worlds.md'],['Interiors','docs/dream/interiors.md'],['Seating','docs/dream/seating.md'],['Behavior','docs/dream/behavior.md'],['Shared rules','docs/dream/rules.md'],['Sports','docs/dream/sports.md'],['NPCs & control','docs/dream/npcs.md'],['Markets & work','docs/dream/commerce.md'],['Businesses','docs/dream/businesses.md'],['Planting & growth','docs/dream/growth.md'],['Scenarios & agents','docs/dream/scenarios.md'],['World systems','docs/world-systems.md'],['Model authoring','docs/dream/model-authoring.md'],['Reference','docs/dream/reference.md'],['Asset library','docs/asset-library.md'],['Media & highlighting','docs/media/README.md']].filter(([,f])=>files.includes(f));
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#fafaf7"><title>${escapeHtml(title)} · Dream</title><link rel="preload" href="${relative('site/fonts/manrope-latin.woff2')}" as="font" type="font/woff2" crossorigin><link rel="preload" href="${relative('site/fonts/archivo-latin.woff2')}" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="${relative('site/style.css')}"><script src="${relative('site/copy.js')}" defer></script></head><body><a class="skip" href="#content">Skip to content</a><header class="site-header">
    <a class="brand" href="https://minimumeffort.dev/" aria-label="Minimum Effort, home"><span class="brand-compact" aria-hidden="true"><span class="brand-compact-m">m</span><span class="brand-compact-e">e.</span></span><span class="brand-name" aria-hidden="true">minimum<span class="brand-effort">effort.</span></span></a>
    <a class="product" href="${relative('index.html')}">Muse Dream<span>Dream 2 documentation</span></a>
    <div class="header-links"><a href="https://musedream.vercel.app/">Play ↗</a><a href="https://github.com/minimumeffort-dev/muse.dream">GitHub ↗</a></div>
  </header><div class="layout"><nav class="docs-nav" aria-label="Documentation"><p class="nav-label">Dream 2 / Docs</p>${groups.map(([label,f])=>`<a ${file===f?'aria-current="page"':''} href="${relative(outputName(f))}">${label}</a>`).join('')}</nav><main id="content" tabindex="-1"><article>${marked.parse(source,{renderer,gfm:true})}</article><footer><span>Handmade mock. No model calls.</span><a href="${repo+file}">Edit this page ↗</a></footer></main></div><div id="copy-status" role="status" class="sr-only"></div></body></html>`;
  await mkdir(path.dirname(path.join(out,destination)),{recursive:true});await writeFile(path.join(out,destination),html);
}
console.log(`Built ${files.length} documentation pages in dist-docs/`);
