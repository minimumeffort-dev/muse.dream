import type {Scene,Point} from '../scene/schema';
import type {CarState} from '../sim/car';
import {createWorldMap,mapView,pixelToMap,panMap,zoomMap,readWaypoint,waypointGuide,waypointDistance,type MapView} from './navigation';

/** Map gestures, navigation preference and dialog focus have one UI owner. */
export function worldMap(scene:Scene,options:{canOpen:()=>boolean;onOpen:()=>void;onClose:()=>void;storage?:()=>Pick<Storage,'getItem'|'setItem'>;storageKey:string}){
  const get=<T extends HTMLElement>(id:string)=>document.querySelector<T>('#'+id)!;
  const mini=get<HTMLCanvasElement>('world-map'),large=get<HTMLCanvasElement>('expanded-map'),dialog=get<HTMLDialogElement>('map-dialog');
  const opener=get<HTMLButtonElement>('map-open'),status=get('map-status'),announcement=get('navigation-announcement');
  const guide=get('waypoint-guide'),distance=get('waypoint-distance'),caption=get('waypoint-caption'),arrow=get('waypoint-arrow');
  const clearButton=get<HTMLButtonElement>('map-clear'),paintMini=createWorldMap(mini,scene),paintLarge=createWorldMap(large,scene);
  const {width,height}=scene.canonical;
  let waypoint:Point|undefined,car:CarState|undefined,angle=0,miniZoom=1,arrived=false,view=mapView(640,480,width,height);
  let drag:{id:number;origin:Point;previous:Point;moved:boolean}|undefined,gesture:MapView|undefined;
  try{waypoint=readWaypoint(options.storage?.().getItem(options.storageKey)??null,width,height);}catch{/* Navigation works for this session when storage is unavailable. */}
  const miniView=()=>mapView(mini.width,mini.height,width,height,miniZoom,car??view.center);
  const redraw=()=>{
    if(!car)return;
    paintMini(car,angle,miniView(),waypoint);
    if(dialog.open)paintLarge(car,angle,view,waypoint);
    guide.hidden=!waypoint;clearButton.disabled=!waypoint;
    if(waypoint){
      const hint=waypointGuide(car,waypoint,angle);
      distance.textContent=hint.arrived ? 'Arrived' : waypointDistance(hint.distance);caption.textContent='Waypoint';
      arrow.style.transform=`rotate(${hint.direction}deg)`;arrow.style.visibility=hint.arrived ? 'hidden' : '';
      if(hint.arrived && !arrived)announcement.textContent='You have reached your waypoint.';
      arrived=hint.arrived;
    }
    if(import.meta.env.DEV)mini.dataset.navigation=JSON.stringify({waypoint:waypoint??null,miniZoom,open:dialog.open,zoom:view.zoom,center:view.center,...(car&&waypoint ? waypointGuide(car,waypoint,angle) : {})});
  };
  const choose=(point:Point|undefined)=>{
    if(point && (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x<0 || point.x>width || point.y<0 || point.y>height))return;
    waypoint=point;arrived=false;
    const message=point ? `Waypoint set${car ? ' · '+waypointDistance(waypointGuide(car,point,angle).distance) : ''}` : 'Waypoint removed';
    let saved=true;try{options.storage?.().setItem(options.storageKey,JSON.stringify({version:1,point:point??null}));}catch{saved=false;}
    status.textContent=message+(saved ? '' : ' · session only');announcement.textContent=status.textContent;redraw();
  };
  const setView=(next:MapView)=>{view=next;get('map-zoom-level').textContent=`${Math.round(view.zoom*100)}%`;redraw();};
  const resize=()=>{
    if(!dialog.open)return;
    const rect=large.getBoundingClientRect(),ratio=Math.min(devicePixelRatio,1.5);
    large.width=Math.max(64,Math.round(rect.width*ratio));large.height=Math.max(64,Math.round(rect.height*ratio));
    setView(mapView(large.width,large.height,width,height,view.zoom,view.center));
  };
  const open=()=>{
    if(dialog.open || !car || !options.canOpen())return;
    dialog.showModal();opener.setAttribute('aria-expanded','true');options.onOpen();resize();
    status.textContent=waypoint ? `Waypoint · ${waypointDistance(waypointGuide(car,waypoint,angle).distance)}` : 'Click to set a waypoint';
    large.focus({preventScroll:true});redraw();
  };
  const close=(resume=true)=>{
    if(!dialog.open)return;drag=undefined;gesture=undefined;dialog.close();large.width=large.height=1;paintLarge.release();opener.setAttribute('aria-expanded','false');if(resume)options.onClose();redraw();
  };
  const findPlayer=()=>{if(car)setView(mapView(large.width,large.height,width,height,Math.max(3,view.zoom),car));};
  const fit=()=>setView(mapView(large.width,large.height,width,height));
  opener.addEventListener('click',open);get('map-close').addEventListener('click',()=>close());
  get('map-fit').addEventListener('click',fit);get('map-player').addEventListener('click',findPlayer);
  get('map-zoom-in').addEventListener('click',()=>setView(zoomMap(view,1.4)));
  get('map-zoom-out').addEventListener('click',()=>setView(zoomMap(view,1/1.4)));
  get('waypoint-clear').addEventListener('click',()=>choose(undefined));clearButton.addEventListener('click',()=>choose(undefined));
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  new ResizeObserver(resize).observe(large);
  const local=(event:{clientX:number;clientY:number})=>{const rect=large.getBoundingClientRect();return {x:(event.clientX-rect.left)*large.width/rect.width,y:(event.clientY-rect.top)*large.height/rect.height};};
  large.addEventListener('pointerdown',e=>{
    if(!e.isPrimary){if(drag)drag.moved=true;return;}if(e.button!==0)return;
    e.preventDefault();large.focus({preventScroll:true});const p=local(e);drag={id:e.pointerId,origin:p,previous:p,moved:false};large.setPointerCapture(e.pointerId);
  });
  large.addEventListener('pointermove',e=>{
    if(!drag || e.pointerId!==drag.id)return;const p=local(e);
    drag.moved ||= Math.hypot(p.x-drag.origin.x,p.y-drag.origin.y)>6;
    if(drag.moved)setView(panMap(view,p.x-drag.previous.x,p.y-drag.previous.y));drag.previous=p;
  });
  large.addEventListener('pointerup',e=>{if(drag?.id!==e.pointerId)return;if(!drag.moved)choose(pixelToMap(view,local(e)));drag=undefined;});
  large.addEventListener('pointercancel',()=>{drag=undefined;});
  const wheelFactor=(e:WheelEvent,canvas:HTMLCanvasElement)=>Math.exp(-e.deltaY*(e.deltaMode===1 ? 16 : e.deltaMode===2 ? canvas.clientHeight : 1)*(e.ctrlKey ? .01 : .002));
  large.addEventListener('wheel',e=>{if(!dialog.open)return;e.preventDefault();if(!gesture)setView(zoomMap(view,wheelFactor(e,large),local(e)));},{passive:false});
  let miniGesture:number|undefined;
  const zoomMini=(zoom:number)=>{miniZoom=Math.max(1,Math.min(12,zoom));get('minimap-title').textContent=miniZoom>1.01 ? 'Nearby' : 'World';redraw();};
  mini.addEventListener('wheel',e=>{if(!options.canOpen())return;e.preventDefault();if(miniGesture===undefined)zoomMini(miniZoom*wheelFactor(e,mini));},{passive:false});
  mini.addEventListener('gesturestart',e=>{if(options.canOpen()){e.preventDefault();miniGesture=miniZoom;}},{passive:false});
  mini.addEventListener('gesturechange',e=>{const scale=(e as Event&{scale:number}).scale;if(miniGesture!==undefined && options.canOpen() && Number.isFinite(scale) && scale>0){e.preventDefault();zoomMini(miniGesture*scale);}},{passive:false});
  mini.addEventListener('gestureend',e=>{if(miniGesture!==undefined)e.preventDefault();miniGesture=undefined;},{passive:false});
  large.addEventListener('gesturestart',e=>{if(dialog.open){e.preventDefault();gesture=view;}},{passive:false});
  large.addEventListener('gesturechange',e=>{const scale=(e as Event&{scale:number}).scale;if(gesture && Number.isFinite(scale) && scale>0){e.preventDefault();setView(zoomMap(gesture,scale));}},{passive:false});
  large.addEventListener('gestureend',e=>{if(gesture)e.preventDefault();gesture=undefined;},{passive:false});
  return {
    get open(){return dialog.open;},show:open,close,clear:()=>choose(undefined),
    update(next:CarState,nextAngle:number){car=next;angle=nextAngle;redraw();},
    key(e:KeyboardEvent){
      if(!dialog.open)return false;
      if(e.metaKey || e.ctrlKey || e.altKey)return true;
      const pan=80*(e.shiftKey?3:1),code=e.code;
      if(code==='Tab'){
        const targets=[...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),canvas[tabindex="0"]')].filter(el=>el.getClientRects().length),current=targets.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();const next=current<0 ? e.shiftKey ? targets.length-1 : 0 : (current+(e.shiftKey?-1:1)+targets.length)%targets.length;
        targets[next]?.focus({preventScroll:true});
      }else if(code==='Escape' || code==='KeyC'){e.preventDefault();if(!e.repeat)close();}
      else if(code==='Equal' || code==='NumpadAdd'){e.preventDefault();setView(zoomMap(view,1.2));}
      else if(code==='Minus' || code==='NumpadSubtract'){e.preventDefault();setView(zoomMap(view,1/1.2));}
      else if(code==='Digit0' || code==='Numpad0'){e.preventDefault();fit();}
      else if(code==='Home'){e.preventDefault();findPlayer();}
      else if(code==='Delete' || code==='Backspace'){e.preventDefault();if(!e.repeat)choose(undefined);}
      else if(['ArrowLeft','KeyA','ArrowRight','KeyD','ArrowUp','KeyW','ArrowDown','KeyS'].includes(code)){
        e.preventDefault();setView(panMap(view,['ArrowLeft','KeyA'].includes(code)?pan:['ArrowRight','KeyD'].includes(code)?-pan:0,['ArrowUp','KeyW'].includes(code)?pan:['ArrowDown','KeyS'].includes(code)?-pan:0));
      }else if((code==='Enter' || code==='Space') && e.target===large){e.preventDefault();if(!e.repeat)choose(view.center);}
      return true;
    },
  };
}
