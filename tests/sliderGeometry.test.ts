import { describe, it, expect } from 'vitest';
import {
  axisOf,
  buildTimeline,
  frameProgress,
  loopProgress,
  splitFraction,
} from '../src/lib/render/sliderGeometry';

describe('sliderGeometry', () => {
  it('resolves the motion axis per direction', () => {
    expect(axisOf('ltr')).toBe('x');
    expect(axisOf('rtl')).toBe('x');
    expect(axisOf('ttb')).toBe('y');
    expect(axisOf('btt')).toBe('y');
  });

  it('computes split fraction respecting direction', () => {
    expect(splitFraction('ltr', 0)).toBeCloseTo(0);
    expect(splitFraction('ltr', 1)).toBeCloseTo(1);
    expect(splitFraction('rtl', 0)).toBeCloseTo(1);
    expect(splitFraction('rtl', 1)).toBeCloseTo(0);
  });

  it('makes pingpong return to the start (triangle wave)', () => {
    expect(loopProgress('pingpong', 0)).toBeCloseTo(0);
    expect(loopProgress('pingpong', 0.5)).toBeCloseTo(1);
    expect(loopProgress('pingpong', 1)).toBeCloseTo(0);
    expect(loopProgress('none', 0.3)).toBeCloseTo(0.3);
  });

  it('builds a timeline with hold + motion frames', () => {
    const tl = buildTimeline(2000, 30, 1000, 1000); // 60 + 30 + 30
    expect(tl.holdStartFrames).toBe(30);
    expect(tl.motionFrames).toBe(60);
    expect(tl.holdEndFrames).toBe(30);
    expect(tl.totalFrames).toBe(120);
  });

  it('pins progress to 0 during start hold and reaches 1 at end of motion', () => {
    const tl = buildTimeline(1000, 30, 1000, 0); // 30 hold + 30 motion
    expect(frameProgress(0, tl)).toBe(0);
    expect(frameProgress(29, tl)).toBe(0); // still in hold
    expect(frameProgress(30, tl)).toBeCloseTo(0); // first motion frame
    expect(frameProgress(60, tl)).toBe(1); // motion complete
  });
});
