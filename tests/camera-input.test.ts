import { describe, expect, it } from "vitest";
import { cameraZoomInput } from "../src/game/camera-input";

function input() {
  const canvas = Object.assign(new EventTarget(), { clientHeight: 720 }) as HTMLElement;
  let playing = true;
  const zoom = cameraZoomInput(canvas, () => playing);
  const send = (type: string, data = {}) => {
    const event = Object.assign(new Event(type, { cancelable: true }), {
      deltaX: 0, deltaY: 0, deltaMode: 0, ctrlKey: false, ...data,
    });
    canvas.dispatchEvent(event);
    return event;
  };
  return { zoom, send, pause: () => { playing = false; }, resume: () => { playing = true; } };
}

describe("trackpad camera zoom", () => {
  it("zooms in and out with reversible scroll amounts and consumes the canvas gesture", () => {
    const { zoom, send } = input();
    expect(send("wheel", { deltaY: -100 }).defaultPrevented).toBe(true);
    expect(zoom.factor).toBeGreaterThan(1);
    send("wheel", { deltaY: 100 });
    expect(zoom.factor).toBeCloseTo(1);
    send("wheel", { deltaY: 100 });
    expect(zoom.factor).toBeLessThan(1);
  });

  it("normalizes pixel, line and page wheel units", () => {
    const factors = [[0, 720], [1, 45], [2, 1]].map(([deltaMode, deltaY]) => {
      const { zoom, send } = input();
      send("wheel", { deltaMode, deltaY: -deltaY! / 4 });
      return zoom.factor;
    });
    expect(factors[0]).toBeCloseTo(factors[1]!);
    expect(factors[1]).toBeCloseTo(factors[2]!);
  });

  it("accepts Chromium/Firefox pinch wheel events without changing browser page zoom", () => {
    const { zoom, send } = input();
    expect(send("wheel", { deltaY: -10, ctrlKey: true }).defaultPrevented).toBe(true);
    expect(zoom.factor).toBeCloseTo(Math.exp(.1));
    send("wheel", { deltaY: 10, ctrlKey: true });
    expect(zoom.factor).toBeCloseTo(1);
  });

  it("uses Safari's cumulative pinch scale once and resumes wheel zoom after the gesture", () => {
    const { zoom, send } = input();
    expect(send("gesturestart").defaultPrevented).toBe(true);
    send("gesturechange", { scale: 1.5 });
    send("wheel", { deltaY: -50, ctrlKey: true });
    expect(zoom.factor).toBe(1.5);
    send("gesturechange", { scale: 2 });
    expect(zoom.factor).toBe(2);
    send("gesturechange", { scale: NaN });
    expect(zoom.factor).toBe(2);
    send("gestureend");
    send("wheel", { deltaY: 100 });
    expect(zoom.factor).toBeLessThan(2);
  });

  it("bounds extreme gestures and responds immediately when their direction reverses", () => {
    const { zoom, send } = input();
    send("wheel", { deltaY: -100000 });
    expect(zoom.factor).toBe(3);
    send("wheel", { deltaY: 1 });
    expect(zoom.factor).toBeLessThan(3);
    send("wheel", { deltaY: 100000 });
    expect(zoom.factor).toBe(.5);
    send("wheel", { deltaY: -1 });
    expect(zoom.factor).toBeGreaterThan(.5);
  });

  it("leaves horizontal navigation and paused browser gestures alone", () => {
    const { zoom, send, pause, resume } = input();
    expect(send("wheel", { deltaX: 100, deltaY: 1 }).defaultPrevented).toBe(false);
    pause();
    expect(send("wheel", { deltaY: -100, ctrlKey: true }).defaultPrevented).toBe(false);
    expect(send("gesturestart").defaultPrevented).toBe(false);
    send("gesturechange", { scale: 2 });
    expect(zoom.factor).toBe(1);
    resume();
    send("wheel", { deltaY: -100 });
    expect(zoom.factor).toBeGreaterThan(1);
  });
});
