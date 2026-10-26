import {readFile,readdir,mkdir,writeFile,copyFile,rm,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {marked} from 'marked';
import {createServer} from 'vite';
import {highlightDream,escapeHtml} from '../docs/site/dream-highlight.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'dist-docs');
const repo='https://github.com/minimumeffort-dev/muse.dream/blob/main/';
const files=['README.md'],sources=new Map(),copied=new Set();
async function walk(directory){
  for(const entry of await readdir(path.join(root,directory),{withFileTypes:true})){
    if(['site','media','evidence'].includes(entry.name)||entry.name.startsWith('.'))continue;
    const name=path.posix.join(directory,entry.name);
    if(entry.isDirectory())await walk(name);else if(name.endsWith('.md'))files.push(name);
  }
}
await walk('docs');
files.sort((a,b)=>a==='README.md'?-1:b==='README.md'?1:a.localeCompare(b));
for(const file of files)sources.set(file,await readFile(path.join(root,file),'utf8'));
const title=file=>sources.get(file).match(/^# (.+)/m)?.[1]||path.posix.basename(file,'.md');
const outputName=file=>file==='README.md'?'index.html':file.slice(5).replace(/\.md$/,'.html');
if(new Set(files.map(outputName)).size!==files.length)throw Error('Documentation page output paths collide.');
const dataOutput=file=>file.startsWith('docs/')?file.slice(5):file;
let commands;
try{commands=JSON.parse(await readFile(path.join(root,'docs/language/dream-v2-contract.json'),'utf8')).commands;}
catch(error){
  if(error.code!=='ENOENT')throw error;
  const server=await createServer({root,configFile:false,logLevel:'silent',server:{middlewareMode:true,watch:null},appType:'custom'});
  try{commands=(await server.ssrLoadModule('/src/engine/scene/dream-contract.ts')).DREAM_V2_COMMANDS;}
  finally{await server.close();}
}
if(!commands||typeof commands!=='object')throw Error('Dream command contract is missing commands.');
await rm(out,{recursive:true,force:true});await mkdir(path.join(out,'site/fonts'),{recursive:true});
for(const name of ['style.css','copy.js'])await copyFile(path.join(root,'docs/site',name),path.join(out,'site',name));
for(const name of await readdir(path.join(root,'fonts')))if(/\.(woff2|txt)$/.test(name))await copyFile(path.join(root,'fonts',name),path.join(out,'site/fonts',name));
async function copyText(file){
  if(copied.has(file))return;
  const destination=dataOutput(file);
  await mkdir(path.dirname(path.join(out,destination)),{recursive:true});
  await copyFile(path.join(root,file),path.join(out,destination));copied.add(file);
}
async function copySources(directory,pattern){
  const entries=await readdir(path.join(root,directory),{withFileTypes:true}).catch(error=>{if(error.code==='ENOENT')return [];throw error;});
  for(const entry of entries){
    const file=path.posix.join(directory,entry.name);
    if(entry.isDirectory())await copySources(file,pattern);else if(pattern.test(file))await copyText(file);
  }
}
await copySources('examples',/\.dream$/);
await copySources('docs/language',/\.(json|txt|ebnf|dream)$/);
for(const file of files){
  const source=sources.get(file),destination=outputName(file),relative=target=>path.posix.relative(path.posix.dirname(destination),target)||'index.html';
  const localLinks=new Map();
  for(const token of marked.lexer(source,{gfm:true})){
    // Resolve links recursively, including table cells and list items, before synchronous rendering.
    marked.walkTokens([token],node=>{if(node.type==='link'||node.type==='image')localLinks.set(node.href,undefined);});
  }
  for(const href of localLinks.keys()){
    const pathnameOnly=(href??'').split(/[?#]/)[0];
    if(/(?:^|\/)(?:media|evidence)(?:\/|$)|\.(?:png|jpe?g|gif|webp|mp4|webm|jsonl)$/i.test(pathnameOnly))throw Error(`${file}: remove the retired capture/evidence link: ${href}`);
    if(!href||/^(?:https?:|mailto:|#)/i.test(href)){localLinks.set(href,href);continue;}
    if(/^[a-z][a-z\d+.-]*:/i.test(href)){localLinks.set(href,'#');continue;}
    const [pathname,...suffix]=href.split(/(?=[?#])/),resolved=path.posix.normalize(path.posix.join(path.posix.dirname(file),pathname));
    if(path.posix.isAbsolute(resolved)||resolved==='..'||resolved.startsWith('../'))throw Error(`${file}: link leaves the Lab: ${href}`);
    if(/(?:^|\/)(?:media|evidence)(?:\/|$)/.test(resolved))throw Error(`${file}: remove the retired capture/evidence link: ${href}`);
    let target;
    if(files.includes(resolved))target=relative(outputName(resolved));
    else{
      const info=await stat(path.join(root,resolved)).catch(()=>undefined);
      if(!info?.isFile())throw Error(`${file}: missing local link: ${href}`);
      if(/\.(dream|json|txt|ebnf)$/.test(resolved)){await copyText(resolved);target=relative(dataOutput(resolved));}
      else target=repo+resolved;
    }
    localLinks.set(href,target+suffix.join(''));
  }
  const renderer=new marked.Renderer(),slugs=new Map();
  renderer.code=({text,lang})=>`<div class="code-block"><div class="code-bar"><span>${escapeHtml(lang||'text')}</span><button type="button" aria-label="Copy code">Copy</button></div><pre tabindex="0"><code class="language-${escapeHtml(lang||'text')}">${lang==='dream'?highlightDream(text,commands):escapeHtml(text)}</code></pre></div>`;
  renderer.link=function({href,title:linkTitle,tokens}){return `<a href="${escapeHtml(localLinks.get(href)??href??'')}"${linkTitle?` title="${escapeHtml(linkTitle)}"`:''}>${this.parser.parseInline(tokens)}</a>`;};
  renderer.image=({href})=>{throw Error(`${file}: image captures are not retained: ${href}`);};
  renderer.html=({text})=>escapeHtml(text);
  renderer.heading=function({tokens,depth,text}){
    const slug=text.toLowerCase().replace(/<[^>]*>|[^\p{L}\p{N}_\-\s]/gu,'').trim().replace(/\s/g,'-'),count=slugs.get(slug)||0;slugs.set(slug,count+1);
    return `<h${depth} id="${slug}${count?'-'+count:''}">${this.parser.parseInline(tokens)}</h${depth}>`;
  };
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#fafaf7"><title>${escapeHtml(title(file))} · Dreams Lab</title><link rel="preload" href="${relative('site/fonts/manrope-latin.woff2')}" as="font" type="font/woff2" crossorigin><link rel="preload" href="${relative('site/fonts/archivo-latin.woff2')}" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="${relative('site/style.css')}"><script src="${relative('site/copy.js')}" defer></script></head><body><a class="skip" href="#content">Skip to content</a><header class="site-header"><a class="brand" href="https://minimumeffort.dev/" aria-label="Minimum Effort, home"><span class="brand-compact" aria-hidden="true"><span class="brand-compact-m">m</span><span class="brand-compact-e">e.</span></span><span class="brand-name" aria-hidden="true">minimum<span class="brand-effort">effort.</span></span></a><a class="product" href="${relative('index.html')}">Dreams Lab<span>Documentation</span></a><div class="header-links"><a href="https://musedream.vercel.app/">Open Lab ↗</a><a href="https://github.com/minimumeffort-dev/muse.dream">GitHub ↗</a></div></header><div class="layout"><nav class="docs-nav" aria-label="Documentation">${files.map(target=>`<a ${file===target?'aria-current="page"':''} href="${relative(outputName(target))}">${escapeHtml(target==='README.md'?'Overview':title(target))}</a>`).join('')}</nav><main id="content" tabindex="-1"><article>${marked.parse(source,{renderer,gfm:true})}</article><footer><span>Mock interpretation and agents.</span><a href="${repo+file}">Edit this page ↗</a></footer></main></div><div id="copy-status" role="status" class="sr-only"></div></body></html>`;
  await mkdir(path.dirname(path.join(out,destination)),{recursive:true});await writeFile(path.join(out,destination),html);
}
console.log(`Built ${files.length} Lab documentation pages in dist-docs/ without captures or evidence.`);
