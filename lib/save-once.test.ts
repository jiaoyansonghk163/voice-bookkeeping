import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createSaveGate } from "./save-once";

test("a confirm session can persist only once", () => {
  const gate = createSaveGate();
  assert.equal(gate.claim("voice-1"), true);
  assert.equal(gate.claim("voice-1"), false);
  assert.equal(gate.claim(""), false);
});

test("a later mic open is a new session and can persist", () => {
  const gate = createSaveGate();
  assert.equal(gate.claim("voice-1"), true);
  assert.equal(gate.claim("voice-2"), true);
  assert.equal(gate.claim("voice-2"), false);
});

test("the install name is 璃记 and a maskable icon is declared", () => {
  const manifest = JSON.parse(readFileSync(new URL("../public/manifest.webmanifest", import.meta.url), "utf8")) as {
    name: string;
    short_name: string;
    icons: { src: string; purpose: string }[];
  };
  assert.equal(manifest.name, "璃记");
  assert.equal(manifest.short_name, "璃记");
  assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable" && icon.src.includes("512")));
});

test("service worker cache generation is v3 and includes file bytes", () => {
  const source = readFileSync(new URL("../scripts/precache.mjs", import.meta.url), "utf8");
  assert.match(source, /const CACHE_GENERATION = "v3"/);
  assert.match(source, /voice-ledger-\$\{CACHE_GENERATION\}/);
  assert.match(source, /readFile\(file\)/);
  assert.doesNotMatch(source, /voice-ledger-v2/);
});
