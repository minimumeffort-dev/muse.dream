import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {highlightDream} from '../docs/site/dream-highlight.mjs';
import {DREAM_V2_COMMANDS} from '../src/scene/dream-contract';

const highlight=(source:string)=>highlightDream(source,DREAM_V2_COMMANDS);
describe('Dream syntax highlighting',()=>{
  it('highlights service periods only at field boundaries and escapes source HTML',()=>{const html=highlight('work records(kind=service,period_s=60); // <Period>&');expect(html).toContain('dream-field">period_s</span>');expect(html).toContain('&lt;Period&gt;&amp;');expect(highlight('period_s_extra my_period_s')).not.toMatch(/dream-field/);});
  it('highlights company and its need constructor at complete boundaries with escaped source',()=>{const html=highlight('account person(company=need(initial=65,drain_s=.05,below=40,gain=35)); // <Company>&');expect(html).toContain('dream-field">company</span>');expect(html).toContain('dream-keyword">need</span>');for(const name of ['initial','gain'])expect(html).toContain(`dream-field">${name}</span>`);expect(html).toContain('&lt;Company&gt;&amp;');expect(highlight('company_extra needs needed initial_extra gainful')).not.toMatch(/dream-(?:field|keyword)/);});
  it('highlights the peer selector at complete boundaries and escapes authored text',()=>{
    const html=highlight('milestone pair(label="<Meal>&",kind=shared_meal,task=host,peer=guest,count=1);');expect(html).toContain('class="dream-field">peer</span>');expect(html).toContain('&lt;Meal&gt;&amp;');expect(highlight('peer_extra peerless')).not.toMatch(/dream-field/);
  });
  it('highlights alternate requirements at complete boundaries and escapes source text',()=>{
    const html=highlight('work bake(requires_any=[practice,table_friend]); milestone friend(kind=shared_meal); // <Recipe>&');expect(html).toContain('class="dream-field">requires_any</span>');expect(html).toContain('&lt;Recipe&gt;&amp;');expect(highlight('requires_anything requires_any_extra')).not.toMatch(/dream-field/);
  });
  it('highlights shelter only at complete boundaries and escapes authored HTML',()=>{
    const html=highlight('rest home(shelter=true,seats=[settee]); // <Cover>&');expect(html).toContain('class="dream-field">shelter</span>');expect(html).toContain('&lt;Cover&gt;&amp;');expect(highlight('sheltered shelter_extra')).not.toMatch(/dream-field/);
  });
  it('highlights attendance only at field boundaries and escapes authored source',()=>{
    const html=highlight('account worker(commute=true,attendance=[8,17]); // <Duty>&');expect(html).toContain('class="dream-field">attendance</span>');expect(html).toContain('&lt;Duty&gt;&amp;');expect(highlight('attendance_extra work_attendance')).not.toMatch(/dream-field/);
  });
  it('highlights stairs and steps at exact boundaries while escaping source text',()=>{const html=highlight('stairs flight(material=wood,at=[0,0,0],size=[4,8,22],steps=12); // <Stairs>&');expect(html).toContain('class="dream-keyword">stairs</span>');expect(html).toContain('class="dream-field">steps</span>');expect(html).toContain('&lt;Stairs&gt;&amp;');expect(highlight('upstairs stairs_extra steps_extra')).not.toMatch(/dream-(?:keyword|field)/);});
  it('highlights floor bindings at exact boundaries and escapes source HTML',()=>{
    const html=highlight('floor upper(on=house,at=[0,9,0],size=[12,32]);place seat(object=bench,role=prop,floor=upper); // <img>\nconst floored=1;');
    expect(html).toContain('dream-keyword">floor</span>');expect(html).toContain('dream-field">floor</span>');expect(html).toContain('&lt;img&gt;');expect(html).not.toContain('dream-keyword">floored');
  });
  it('highlights rest commands and fields at exact boundaries and escapes authored text',()=>{
    const html=highlight('rest home(energy=20,recover_s=5,below=25,until=85,seats=[bench],on=yard); account person(rest=home); // <Rest>&');
    expect(html).toContain('class="dream-keyword">rest</span>');expect(html).toContain('class="dream-field">energy</span>');expect(html).toContain('&lt;Rest&gt;&amp;');expect(highlight('resting rest_plan recover_something')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights commuting only at field boundaries and escapes labels',()=>{
    const html=highlight('account worker(commute=true,on=home,grounds=[hall],works=[bake]); // <Work>&');
    expect(html).toContain('class="dream-field">commute</span>');expect(html).toContain('&lt;Work&gt;&amp;');expect(highlight('commutes commute_extra commuter')).not.toMatch(/dream-field/);
  });
  it('highlights weather and repair conditions at exact boundaries with escaped source',()=>{
    const html=highlight('weather(cycle_s=600,rain_start_s=90,rain_end_s=150,wet_grip=.68); repair kit(dry=true,label="<Rain>&");');
    expect(html).toContain('class="dream-keyword">weather</span>');for(const key of ['rain_start_s','rain_end_s','wet_grip','dry'])expect(html).toContain(`class="dream-field">${key}</span>`);expect(html).toContain('&lt;Rain&gt;&amp;');expect(highlight('weathered weather_extra dry_extra wet_grips')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights ration commands and fields at exact boundaries with escaped source',()=>{
    const html=highlight('ration snack(good=bread,market=corner,below=40); // <Food>&');
    expect(html).toContain('class="dream-keyword">ration</span>');expect(html).toContain('class="dream-field">below</span>');expect(html).toContain('&lt;Food&gt;&amp;');expect(highlight('rations ration_extra below_extra')).not.toMatch(/dream-(?:keyword|field)/);
  });

  it('highlights recovery fields at exact boundaries and escapes source text',()=>{
    const html=highlight('repair trees(recover=boards,amount=1,label="<Wood>&"); // <Source>&');
    for(const key of ['recover','amount'])expect(html).toContain(`class="dream-field">${key}</span>`);expect(html).toContain('&lt;Wood&gt;&amp;');expect(html).toContain('&lt;Source&gt;&amp;');expect(highlight('recovered recover_extra amounts amount_extra')).not.toMatch(/dream-(?:keyword|field)/);
  });

  it('highlights on-foot strike declarations at full boundaries and escapes authored HTML',()=>{
    const html=highlight('strike(reach=10,speed=100,cooldown_s=.6); // <Hand>&');
    expect(html).toContain('class="dream-keyword">strike</span>');expect(html).toContain('class="dream-field">reach</span>');expect(html).toContain('&lt;Hand&gt;&amp;');expect(highlight('striker strike_extra reacher reach_extra')).not.toMatch(/dream-(?:keyword|field)/);
  });

  it('highlights equipment only at field boundaries and escapes labels and comments',()=>{
    const html=highlight('work bake(label="<Bench>&",equipment=[table_one]); // <Tool>&');
    expect(html).toContain('class="dream-field">equipment</span>');expect(html).toContain('&lt;Bench&gt;&amp;');expect(html).toContain('&lt;Tool&gt;&amp;');expect(highlight('equipments equipment_extra unequipment')).not.toMatch(/dream-(?:keyword|field)/);
  });

  it('highlights stride at token boundaries and escapes authored labels',()=>{
    const html=highlight('joint hip(motion=stride(axis=z,deg=24,length=20,phase_deg=0)); // <Paw>&');
    expect(html).toContain('class="dream-keyword">stride</span>');expect(html).toContain('&lt;Paw&gt;&amp;');expect(highlight('strider stride_extra')).not.toMatch(/>stride<\/span>/);
  });
  it('highlights the facet field at whole-token boundaries and escapes authored labels',()=>{
    const html=highlight('part leaf(shape=icosphere,faceted=true); // <Tree>&');
    expect(html).toContain('class="dream-field">faceted</span>');expect(html).toContain('&lt;Tree&gt;&amp;');expect(highlight('facetedness faceted_extra')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights utility proportion kinds at whole-token boundaries and escapes authored labels',()=>{
    const html=highlight('measure(kind=pickup,axis=x,meters=4.95);measure(kind=truck,axis=x,meters=6.6); // <Fleet>&');
    for(const word of ['pickup','truck'])expect(html).toContain(`class="dream-symbol">${word}</span>`);
    expect(html).toContain('&lt;Fleet&gt;&amp;');const longer=highlight('pickup_extra trucks trucking');for(const word of ['pickup_extra','trucks','trucking'])expect(longer).toContain(`>${word}</span>`);expect(longer).not.toMatch(/>(?:pickup|truck)<\/span>/);
  });
  it('highlights bone mounts and layout clearance at whole-token boundaries and escapes authored text',()=>{
    const html=highlight('mount hair(bone=spine){use detail(component=haircut);}body(clearance=14); // <Hair>&');
    expect(html).toContain('class="dream-keyword">mount</span>');for(const field of ['bone','clearance'])expect(html).toContain(`class="dream-field">${field}</span>`);expect(html).toContain('&lt;Hair&gt;&amp;');expect(highlight('mounted mount_extra clearances clearance_extra backbone')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights social plans and meal-history guards at exact boundaries with HTML escaping',()=>{
    const html=highlight('social break_time(good=bread,seats=[bench],on=plaza,eat_s=8,cooldown_s=600,max_fullness=80);on memory(event=interact,to=hello,radius=55,shared_meals=1); // <Meal>&');
    expect(html).toContain('class="dream-keyword">social</span>');for(const word of ['cooldown_s','max_fullness','shared_meals'])expect(html).toContain(`class="dream-field">${word}</span>`);expect(html).toContain('&lt;Meal&gt;&amp;');expect(highlight('socials social_extra shared_meals_extra cooldown_s_extra')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights shift declarations and fields at full boundaries and escapes text',()=>{
    const html=highlight('shift morning(market=bakery,rest=[20,30],on=plaza,lead_s=15);account vendor(shift=morning); // <Staff>&');
    expect(html).toContain('class="dream-keyword">shift</span>');for(const word of ['rest','lead_s'])expect(html).toContain(`class="dream-field">${word}</span>`);expect(html).toContain('&lt;Staff&gt;&amp;');expect(highlight('shifts rest_extra lead_s_extra')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights service hours at exact field boundaries and escapes market labels',()=>{
    const html=highlight('market bakery(label="<Counter>&",hours=[6,22]);');
    expect(html).toContain('class="dream-field">hours</span>');expect(html).toContain('&lt;Counter&gt;&amp;');expect(highlight('hours_extra afterhours')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights furniture seats at complete boundaries and escapes authored labels',()=>{
    const text='seat left(at=[-13,18,8],approach=[-13,48],heading_deg=90); meal lunch(good=bread,markets=[shop],on=plaza,eat_s=4,seats=[bench]); seatbelt(seating=1); "<img src=x onerror=bad>"';
    const html=highlight(text);
    for(const word of ['seat','approach','heading_deg','seats'])expect(html).toContain(`>${word}</span>`);
    expect(html).not.toContain('>seat</span>belt');expect(html).not.toContain('<img');expect(html).toContain('&lt;img');
  });
  it('highlights meal commands and fields without swallowing identifiers or authored HTML',()=>{
    const html=highlight('meal lunch(good=bread,markets=[corner],on=plaza,eat_s=4);account visitor(meal=lunch); // <Lunch>&');
    for(const word of ['meal'])expect(html).toContain(`class="dream-keyword">${word}</span>`);
    for(const word of ['markets','eat_s'])expect(html).toContain(`class="dream-field">${word}</span>`);
    expect(html).toContain('&lt;Lunch&gt;&amp;');expect(highlight('meals meal_extra markets_extra eat_s_extra')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights personal milestone guards at exact boundaries and escapes labels',()=>{
    const html=highlight('milestone practice(label="<Practice>&",kind=work,task=bake,count=3);work large(requires=practice);account baker(works=[large,bake]);');
    expect(html).toContain('class="dream-keyword">milestone</span>');for(const word of ['requires','works','task'])expect(html).toContain(`class="dream-field">${word}</span>`);expect(html).toContain('&lt;Practice&gt;&amp;');expect(highlight('milestones requires_extra works_extra task_extra')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights business fields at full boundaries and escapes authored labels',()=>{
    const html=highlight('market depot(label="<Depot>&",owner=seller,sale=15){lot stock(good=flour,quantity=3,limit=3);}');
    for(const field of ['owner','sale'])expect(html).toContain(`class="dream-field">${field}</span>`);
    expect(html).toContain('&lt;Depot&gt;&amp;');expect(highlight('ownership owner_extra sales sale_extra')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights recipe ingredients at full boundaries and escapes authored text',()=>{
    const html=highlight('work lunch(label="<Lunch>&"){ingredient(good=bread,take=1);ingredient(good=greens,take=2);}');
    expect(html).toContain('class="dream-keyword">ingredient</span>');expect(html).toContain('&lt;Lunch&gt;&amp;');expect(highlight('ingredients ingredient_extra good_extra takes')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights interior commands and shell fields at exact boundaries, escaping labels',()=>{
    const html=highlight('object hall(label="<Hall>&"){interior(at=[0,1,0],size=[30,20,30]){portal door(side=front,offset=0,width=10,height=20);}part roof(cutaway=roof);}');
    for(const word of ['interior','portal'])expect(html).toContain(`class="dream-keyword">${word}</span>`);
    expect(html).toContain('class="dream-field">cutaway</span>');expect(html).toContain('&lt;Hall&gt;&amp;');expect(highlight('interiority portals cutaways')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights pooled destruction fields at complete boundaries and escapes labels',()=>{
    const html=highlight('world(damage_pool=true);rule lights(kind=lamp,mode=topple(speed=95));object light(label="<Lamp>&");');
    expect(html).toContain('class="dream-field">damage_pool</span>');expect(html).toContain('class="dream-keyword">topple</span>');expect(html).toContain('&lt;Lamp&gt;&amp;');expect(highlight('damage_pool_extra lamplighter topples')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights courier policies and grounds at exact boundaries and escapes labels',()=>{
    const html=highlight('account runner(deliveries=[supplies]);delivery supplies(label="<Cargo>&",on=yard,grounds=[depot]);');
    expect(html).toContain('class="dream-field">deliveries</span>');expect(html).toContain('class="dream-field">grounds</span>');expect(html).toContain('&lt;Cargo&gt;&amp;');expect(highlight('deliveries_extra groundskeeper')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights natural finish fields without swallowing longer identifiers or HTML',()=>{
    const html=highlight('surface orchard(points=[[1,2],[3,4],[5,2]],finish=terrain); // <ground>&');
    expect(html).toContain('class="dream-field">finish</span>');expect(html).toContain('class="dream-symbol">terrain</span>');expect(html).toContain('&lt;ground&gt;&amp;');expect(highlight('finishing finish_extra terrainwork')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights planting fields at complete boundaries and escapes authored labels',()=>{
    const html=highlight('account gardener(repairs=[trees,furniture]);repair trees(label="<Plant>&",regrow_s=180,seed_scale=.15);');
    for(const field of ['repairs','regrow_s','seed_scale'])expect(html).toContain(`class="dream-field">${field}</span>`);
    expect(html).toContain('&lt;Plant&gt;&amp;');expect(highlight('repairs_extra regrow_slow seed_scaleway')).not.toMatch(/dream-(?:keyword|field)/);
  });
  it('highlights repair commands and dispatch fields without consuming longer IDs or authored HTML',()=>{
    const html=highlight('repair tables(label="<Repair>&",on=yard,kind=table,dispatch_s=12);account worker(repair=tables);');
    expect(html).toContain('class="dream-keyword">repair</span>');expect(html).toContain('class="dream-field">dispatch_s</span>');expect(html).toContain('&lt;Repair&gt;&amp;');expect(highlight('repairman repairs_extra dispatch_s_extra')).not.toMatch(/dream-(?:keyword|field)/);
  });
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
  it('highlights street repair fields, preserves boundaries and escapes text',()=>{
    const html=highlight('repair service(streets=[main],verge=24,label="<work>&");');
    for(const name of ['streets','verge'])expect(html).toContain(`class="dream-field">${name}</span>`);
    expect(html).toContain('&lt;work&gt;&amp;');expect(html).not.toContain('<work>');
    expect(highlight('vergeway oververge streetscape')).not.toMatch(/dream-(?:keyword|field)/);
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
