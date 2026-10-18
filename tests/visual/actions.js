import {setCaption} from '../../src/game/caption';
import {choiceCards} from '../../src/game/choices';
const status=document.createElement('output');status.id='caption-check';status.setAttribute('role','status');document.body.prepend(status);
const check=(value,message)=>{if(!value)throw Error(message);};
try{
 const element=document.createElement('button');
 setCaption(element,'<script>literal</script> · 12 🪙');
 check(!element.querySelector('script'),'Caption markup executed');
 check(element.textContent.includes('<script>literal</script>'),'Plain label changed');
 check(element.querySelector('[role="img"]').getAttribute('aria-label')==='coins','Currency has no accessible meaning');
 setCaption(element,'<script>literal</script> · 12 🪙');check(element.querySelectorAll('svg').length===1,'Repeated update duplicated the coin');
 setCaption(element,'0 🪙');check(element.textContent==='0 ','Zero balance was lost');
 setCaption(element,'Plain label');check(!element.querySelector('svg') && element.textContent==='Plain label','A stale coin survived');
 const slots=document.createElement('div');document.body.append(slots);const cards=choiceCards(slots,()=>{});
 cards.set([{id:'a',label:'<img> literal'},{id:'b',label:'Bread'}]);cards.select('b');cards.set([{id:'b',label:'Bread'},{id:'a',label:'<img> literal'}]);
 check(cards.value==='b' && slots.children[0].textContent==='Bread','Selection or authored order changed');
 check(!slots.querySelector('img') && slots.querySelectorAll('[tabindex="0"]').length===1,'Unsafe label or duplicate tab stops');
 cards.move(1);check(cards.value==='a','Arrow selection failed');cards.set([]);check(cards.hidden && !cards.focus(),'Empty slots retained focus');slots.remove();
 status.textContent='HUD checks passed: safe captions, accessible coins, stable item order, keyboard selection and empty focus.';
}catch(error){status.textContent=String(error);throw error;}
