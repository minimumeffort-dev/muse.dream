import {icon} from './icons';
const previous=new WeakMap<HTMLElement,string>();
/** Plain labels stay text; only the engine's coin glyph becomes a fixed UI asset. */
export function setCaption(element:HTMLElement,value:string):void{
 if(previous.get(element)===value)return;previous.set(element,value);
 if(!value.includes('🪙')){element.textContent=value;return;}
 const pieces=value.split('🪙'),nodes:HTMLElement[]=[];
 for(let i=0;i<pieces.length;i++){
  const text=document.createElement('span');text.className='caption-text';text.textContent=pieces[i]!;nodes.push(text);
  if(i===pieces.length-1)continue;
  const coin=document.createElement('span');coin.className='currency-unit';coin.setAttribute('role','img');coin.setAttribute('aria-label','coins');coin.innerHTML=icon('coin');nodes.push(coin);
 }
 element.replaceChildren(...nodes);
}
