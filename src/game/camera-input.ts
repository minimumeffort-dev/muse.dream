/** User framing stays relative to the current vehicle's automatic framing. */
export function cameraZoomInput(canvas: HTMLElement, enabled: () => boolean): { factor: number; key(code:string):boolean } {
  const zoom = { factor: 1, key(code:string){
    if(!enabled())return false;
    if(code==='Equal' || code==='NumpadAdd')set(zoom.factor*1.15);
    else if(code==='Minus' || code==='NumpadSubtract')set(zoom.factor/1.15);
    else if(code==='Digit0' || code==='Numpad0')set(1);
    else return false;
    return true;
  } };
  let gestureBase: number | undefined;
  const set = (factor: number) => { zoom.factor = Math.max(.5, Math.min(3, factor)); };

  canvas.addEventListener("wheel", (event) => {
    if (!enabled() || !event.ctrlKey && Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    event.preventDefault();
    // Safari can emit wheel events alongside its native pinch gesture.
    if (gestureBase !== undefined) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
    set(zoom.factor * Math.exp(-event.deltaY * unit * (event.ctrlKey ? .01 : .0015)));
  }, { passive: false });

  canvas.addEventListener("gesturestart", (event) => {
    gestureBase = enabled() ? zoom.factor : undefined;
    if (gestureBase !== undefined) event.preventDefault();
  }, { passive: false });
  canvas.addEventListener("gesturechange", (event) => {
    if (gestureBase === undefined || !enabled()) return;
    event.preventDefault();
    const scale = (event as Event & { scale: number }).scale;
    if (Number.isFinite(scale) && scale > 0) set(gestureBase * scale);
  }, { passive: false });
  canvas.addEventListener("gestureend", (event) => {
    if (gestureBase !== undefined && enabled()) event.preventDefault();
    gestureBase = undefined;
  }, { passive: false });
  return zoom;
}
