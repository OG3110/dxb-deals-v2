// Pure wheel-gesture stepper for snap feeds (Designs 3 and 4): exactly one slide per gesture, whatever the input device.
// A gesture ends only after the wheel has been idle for `idleMs` (every event pushes the end further out, so
// trackpad momentum belongs to the same gesture). Once a gesture has stepped it is locked and later deltas
// are discarded. Driven by explicit timestamps so it can be unit-tested without timers.
export interface WheelStepperOptions { idleMs?: number; threshold?: number }
export type Step = -1 | 0 | 1;

const LINE_PX = 16; // DOM_DELTA_LINE (Firefox mouse wheel: deltaY ≈ ±3 per notch)

/** deltaY in pixels: deltaMode 0 = px, 1 = lines, 2 = pages. */
export function normaliseDelta(deltaY: number, deltaMode: number, pageHeight: number): number {
  return deltaMode === 1 ? deltaY * LINE_PX : deltaMode === 2 ? deltaY * pageHeight : deltaY;
}

export function createWheelStepper({ idleMs = 200, threshold = 30 }: WheelStepperOptions = {}) {
  let last = -Infinity, acc = 0, locked = false;
  return {
    onWheel(deltaY: number, deltaMode: number, now: number, pageHeight: number): Step {
      if (now - last > idleMs) { acc = 0; locked = false; } // previous gesture ended
      last = now;
      if (locked) return 0;
      acc += normaliseDelta(deltaY, deltaMode, pageHeight);
      if (Math.abs(acc) < threshold) return 0;
      locked = true;
      const step: Step = acc > 0 ? 1 : -1;
      acc = 0;
      return step;
    },
  };
}
