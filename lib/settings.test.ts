import assert from "node:assert/strict";
import test from "node:test";
import { DICTATION_KEY, readKeyboardDictation, writeKeyboardDictation } from "./settings";

function fake(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

test("keyboard dictation defaults to off", () => {
  assert.equal(readKeyboardDictation(fake()), false);
  assert.equal(readKeyboardDictation(null), false);
});

test("keyboard dictation round-trips", () => {
  const s = fake();
  writeKeyboardDictation(true, s);
  assert.equal(s.data[DICTATION_KEY], "1");
  assert.equal(readKeyboardDictation(s), true);
  writeKeyboardDictation(false, s);
  assert.equal(readKeyboardDictation(s), false);
});

test("storage failures fall back to off", () => {
  const bad = {
    getItem: () => {
      throw new Error("x");
    },
    setItem: () => {
      throw new Error("x");
    },
  };
  assert.equal(readKeyboardDictation(bad), false);
  assert.doesNotThrow(() => writeKeyboardDictation(true, bad));
});
