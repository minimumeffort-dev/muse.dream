import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {highlightDream} from '../docs/site/dream-highlight.mjs';
import {DREAM_V2_COMMANDS} from '../src/scene/dream-contract';

const highlight=(source:string)=>highlightDream(source,DREAM_V2_COMMANDS);
describe('Dream syntax highlighting',()=>{
  it('highlights dormant parking and local control adapters at complete token boundaries',()=>{
    const html=highlight('asset car(module=library,object=van,control=car);place bike(role=controllable,parked=true);furnish bikes(role=controllable); // <script>&');
    expect(html).toContain('class="dream-field">parked</span>');expect(html).toContain('class="dream-field">control</span>');expect(html).toContain('&lt;script&gt;&amp;');expect(highlight('parked_extra parking controller')).not.toMatch(/dream-field/);
  });
  it('highlights commerce boundaries and escapes labels without consuming longer IDs',()=>{
    const html=highlight('economy(){good bread(label="<Bread>&",food=45);account buyer(actor=player,credits=20,capacity=8,satiety=40,drain_s=.05);market stall(label="Bakery",actor=vendor,credits=100,radius=60){lot shelf(good=bread,quantity=8,limit=16,price=5);}delivery trip(label="Cargo",from=stall,to=counter,good=bread,quantity=2,pay=4,capacity=1);work bake(input=flour,take=1,output=bread,make=2,seconds=6,pay=3,effort=12,target=4);}');
    for(const word of ['economy','good','account','market','lot','work','delivery'])expect(html).toContain(`class="dream-keyword">${word}</span>`);
    expect(html).toContain('&lt;Bread&gt;&amp;');expect(highlight('economical goodness accountant marketplace lottery workplace deliveryman')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights bounded motion constructors without consuming identifiers or HTML',()=>{
    const html=highlight('place hare(role=ambient,motion=roam(radius=90,speed=5,alert=70,flee_speed=30,recover_s=2,gait=hop)); furnish people(motion=walk(speed=14,wait_s=1)); // <script>');
    for(const word of ['walk','roam'])expect(html).toContain('class="dream-keyword">'+word+'</span>');
    for(const word of ['alert','flee_speed','recover_s','gait'])expect(html).toContain('class="dream-field">'+word+'</span>');
    expect(highlight('walkway roaming alertness flee_speed_extra')).not.toMatch(/dream-(?:keyword|field)/);
    expect(html).not.toContain('<script>');
  });
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
  it('highlights NPC vocabulary without swallowing identifier prefixes',()=>{
    const html=highlight('behavior stroll(start=walking){state walking(action=patrol){on notice(event=near_player,to=watching,radius=65);}} place neighbor(object=person,role=npc,behavior=stroll);');
    for(const word of ['behavior','state','on'])expect(html).toContain(`class="dream-keyword">${word}</span>`);
    for(const word of ['role','behavior','action','event','to','radius'])expect(html).toContain(`class="dream-field">${word}</span>`);
    expect(highlight('stateful onlooker behavior_tree')).not.toContain('dream-keyword');
  });
  it('highlights speech fields without consuming identifiers and escapes authored replies',()=>{
    const html=highlight('state reply(action=idle,say="<script>&"){on talk(event=interact,to=reply,radius=55,familiar=false);}');
    expect(html).toContain('class="dream-field">familiar</span>');expect(html).toContain('class="dream-field">say</span>');expect(html).toContain('&lt;script&gt;&amp;');expect(html).not.toContain('<script>');
    expect(highlight('sayings interactable familiarity')).not.toContain('dream-field');
  });
  it('highlights cycle_width as one field without consuming similarly named IDs',()=>{
    expect(highlight('street avenue(cycle_width=20);')).toContain('class="dream-field">cycle_width</span>');
    expect(highlight('cycle_width_extra cycle_widthway')).not.toContain('dream-field');
  });
  it('highlights city connection commands without consuming similarly named symbols',()=>{
    const html=highlight('junction corner(at=[10,20]);street main(via=[corner,end]);site home(entry=[0,-20],serves=[school]);crossing zebra(junction=true);stop school(at=[10,20],site=platform);');
    for(const name of ['junction','site','crossing','stop'])expect(html).toContain(`class="dream-keyword">${name}</span>`);
    for(const name of ['via','entry','serves','junction'])expect(html).toContain(`class="dream-field">${name}</span>`);
    expect(highlight('junctional sitework crossingway stopper')).not.toContain('dream-keyword');
  });
  it('highlights population fields and route phases without consuming symbol prefixes',()=>{
    const html=highlight('furnish lights(objects=[lamp],streets=[main],grounds=[square],paving=#aaa99f);flock birds(flap_hz=3,flap_deg=18);place bus(phase_s=64);');
    for(const name of ['furnish','flock'])expect(html).toContain(`class="dream-keyword">${name}</span>`);
    for(const name of ['objects','streets','grounds','paving','flap_hz','flap_deg','phase_s'])expect(html).toContain(`class="dream-field">${name}</span>`);
    expect(highlight('furnishing flocking phase_stone')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights daylight and lamp declarations without consuming longer symbols',()=>{
    const html=highlight('daylight(cycle_s=600,start_hour=10);material glass(night=#ffcc88);lamp(at=[0,38,0],radius=30,color=#ffd18a);');
    for(const word of ['daylight','lamp'])expect(html).toContain(`class="dream-keyword">${word}</span>`);
    for(const word of ['cycle_s','start_hour','night'])expect(html).toContain(`class="dream-field">${word}</span>`);
    expect(highlight('daylighting lampstand nighttime')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights profile fields and rolling joints with source preservation and escaping',()=>{
    const html=highlight('part shell(shape=prism,outline=[[0,0],[1,0],[.7,1]]);joint axle(motion=roll(axis=z,radius=4)); // <script>');
    expect(html).toContain('class="dream-field">outline</span>');expect(html).toContain('class="dream-symbol">prism</span>');
    expect(html).toContain('class="dream-keyword">roll</span>');expect(html).not.toContain('<script>');
    expect(highlight('outliner outline_extra prismatically')).not.toMatch(/dream-(?:field|keyword)/);
    const contract=JSON.parse(readFileSync('docs/dream-v2-contract.json','utf8'));
    expect(contract.commands.part.fields.outline).toBe('points2?');expect(contract.commands.roll.contexts).toContain('joint_motion');
  });
  it('highlights voxel construction without consuming related symbols or HTML',()=>{
    const html=highlight('voxels wall(grid=[8,8,8],chunks=[2,2,1]){fill solid(from=[0,0,0],to=[8,8,8]);cut opening(shape=ellipsoid);} // <script>');
    for(const name of ['voxels','fill','cut'])expect(html).toContain(`class="dream-keyword">${name}</span>`);
    for(const name of ['grid','chunks','from','to'])expect(html).toContain(`class="dream-field">${name}</span>`);
    expect(html).not.toContain('<script>');expect(highlight('voxelstuff fillable cutaway gridlock')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('tracks the generated compiler vocabulary',()=>{
    const contract=JSON.parse(readFileSync('docs/dream-v2-contract.json','utf8'));
    expect(Object.keys(contract.commands)).toEqual(Object.keys(DREAM_V2_COMMANDS));
    for(const command of Object.keys(contract.commands))expect(highlight(command+'()')).toContain(`class="dream-keyword">${command}</span>`);
  });
  it('highlights material parameters without consuming longer symbols or HTML',()=>{
    const source='component leg(params=[h],materials=[finish]){use nested(component=post,args=[h],materials=[finish]);} // <script>';
    const html=highlight(source);
    expect(html).toContain('class="dream-field">materials</span>');
    expect(html).toContain('class="dream-symbol">finish</span>');
    expect(highlight('materials_extra finish_materials')).not.toMatch(/dream-field/);
    expect(html).not.toContain('<script>');
    expect(html.replace(/<[^>]+>/g,'').replaceAll('&lt;','<').replaceAll('&gt;','>')).toBe(source);
  });
  it('highlights scenario declarations and fields without swallowing related identifiers',()=>{
    const html=highlight('scenario day(seed=1,max_steps=80){agent courier(budget=9);service clinic(consumes=kit,produces=receipt,duration=4,fee=1);objective care(kind=produce,quantity=1);} // <script>');
    for(const name of ['scenario','agent','service','objective'])expect(html).toContain(`class="dream-keyword">${name}</span>`);
    for(const name of ['seed','max_steps','budget','consumes','produces','duration','fee','quantity'])expect(html).toContain(`class="dream-field">${name}</span>`);
    expect(highlight('scenario_builder agency services stockroom')).not.toMatch(/dream-keyword/);expect(html).not.toContain('<script>');
  });
});

describe('published site',()=>{
  it('keeps the voxel guide identical to its complete runnable source',()=>{
    const guide=readFileSync('docs/dream/voxels.md','utf8');
    expect(guide.match(/```dream\n([\s\S]*?)```/)![1]!.trim()).toBe(readFileSync('docs/examples/voxel-wall.dream','utf8').trim());
  });
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
        expect(url.hostname,`${file}: development URL in published href/src: ${match[1]}`).not.toMatch(/(^|\.)localhost\.?$|^127\.|^(?:0\.0\.0\.0|\[::1\])$/i);
        if(match[0].startsWith('src='))expect(url.hostname==='github.com' && url.pathname.includes('/blob/'),`${file}: a GitHub page cannot serve an embedded asset`).toBe(false);
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
