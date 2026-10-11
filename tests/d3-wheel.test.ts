import { describe, it, expect } from 'vitest';
import { createWheelStepper, normaliseDelta } from '../src/designs/d3-feed-all/wheel';

const H = 662; // feed height (px)
const run = (events: [deltaY: number, mode: number, t: number][]) => {
  const s = createWheelStepper({ idleMs: 200, threshold: 30 });
  return events.map(([d, m, t]) => s.onWheel(d, m, t, H)).filter(x => x !== 0);
};

describe('d3 wheel stepper', () => {
  it('a momentum stream of 40 events over 1.2 s is one step', () => {
    // decaying trackpad flick: big deltas first, then a long momentum tail, ~30 ms apart (never idle > 200 ms)
    const ev = Array.from({ length: 40 }, (_, i) => [Math.max(1, Math.round(120 * Math.exp(-i / 10))), 0, 1000 + i * 30] as [number, number, number]);
    expect(ev.at(-1)![2] - ev[0][2]).toBeGreaterThanOrEqual(1150);
    expect(run(ev)).toEqual([1]);
  });
  it('two flicks separated by more than idleMs are two steps', () => {
    const flick = (t0: number, d: number) => Array.from({ length: 8 }, (_, i) => [d, 0, t0 + i * 16] as [number, number, number]);
    expect(run([...flick(1000, 40), ...flick(1000 + 7 * 16 + 250, 40)])).toEqual([1, 1]);
    expect(run([...flick(1000, -40), ...flick(1400, 40)])).toEqual([-1, 1]);
  });
  it('a Firefox line-mode notch (deltaMode 1, deltaY 3) steps', () => {
    expect(run([[3, 1, 1000]])).toEqual([1]);
    expect(run([[-3, 1, 1000]])).toEqual([-1]);
    expect(normaliseDelta(3, 1, H)).toBe(48);
    expect(normaliseDelta(1, 2, H)).toBe(H);
    expect(run([[1, 2, 1000]])).toEqual([1]);
  });
  it('a pixel-mode mouse notch (deltaY 100) steps once', () => {
    expect(run([[100, 0, 1000]])).toEqual([1]);
  });
  it('tiny deltas below the threshold never step', () => {
    expect(run([[5, 0, 1000], [6, 0, 1010], [-4, 0, 1020], [10, 0, 1500], [8, 0, 2000]])).toEqual([]);
  });
  it('deltas are discarded while a gesture is locked (no carry-over)', () => {
    const s = createWheelStepper({ idleMs: 200, threshold: 30 });
    expect(s.onWheel(40, 0, 1000, H)).toBe(1);
    for (let t = 1010; t < 1190; t += 10) expect(s.onWheel(500, 0, t, H)).toBe(0);
    // new gesture after idle: a small delta must not inherit anything accumulated while locked
    expect(s.onWheel(10, 0, 1500, H)).toBe(0);
  });
});
