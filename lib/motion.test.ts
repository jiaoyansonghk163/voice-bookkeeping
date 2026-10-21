import assert from "node:assert/strict";
import test from "node:test";
import {
  BACKDROP_IN_S,
  BANNER_S,
  CARD_FADE_S,
  CARD_STAGGER_S,
  CROSS_FADE_S,
  EASE_A,
  FAB_PRESS_S,
  FAB_RELEASE_S,
  PULSE_S,
  SHEET_IN_S,
  SHEET_OUT_S,
  TAB_S,
  WAVE_HEIGHTS,
} from "./motion";

test("easing A and the detail-sheet durations stay put", () => {
  assert.deepEqual(EASE_A, [0.22, 1, 0.36, 1]);
  assert.equal(SHEET_IN_S, 0.22);
  assert.equal(SHEET_OUT_S, 0.18);
  assert.equal(BACKDROP_IN_S, 0.2);
  assert.equal(CROSS_FADE_S, 0.18);
  assert.equal(PULSE_S, 1.8);
  assert.equal(TAB_S, 0.16);
  assert.equal(BANNER_S, 0.16);
  assert.equal(CARD_FADE_S, 0.16);
  assert.equal(CARD_STAGGER_S, 0.04);
  assert.equal(FAB_PRESS_S, 0.1);
  assert.equal(FAB_RELEASE_S, 0.16);
});

test("the waveform is a fixed set of bars, not a loop", () => {
  assert.ok(WAVE_HEIGHTS.length >= 6 && WAVE_HEIGHTS.length <= 12);
  assert.deepEqual([...WAVE_HEIGHTS], [8, 14, 10, 18, 12, 16, 9]);
});
