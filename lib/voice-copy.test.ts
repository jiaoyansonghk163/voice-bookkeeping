import assert from "node:assert/strict";
import test from "node:test";
import { parseTranscript } from "./parse-transcript";
import { VOICE_COPY, sourceLine } from "./voice-copy";

test("voice copy follows the copy sheet", () => {
  assert.equal(VOICE_COPY.listenTitle, "正在听…");
  assert.equal(VOICE_COPY.listenSubtitle, "比如:午饭 28 块,打车 15");
  assert.equal(VOICE_COPY.failTitle, "没听清,再说一次?");
  assert.equal(VOICE_COPY.typeInstead, "手动记一笔");
  assert.equal(VOICE_COPY.retake, "重说");
  assert.equal(VOICE_COPY.typeTitle, "记一笔");
  assert.equal(VOICE_COPY.confirmAll, "记下");
  assert.equal(VOICE_COPY.cancel, "取消");
  assert.equal(sourceLine("地铁十二块五"), "听到了:地铁十二块五");
});

test("a bare amount is low confidence and a unit amount is not", () => {
  const bare = parseTranscript("咖啡二十八");
  const sure = parseTranscript("午饭三十八块");
  assert.equal(bare.ok && bare.entries[0]?.confidence, "low");
  assert.equal(sure.ok && sure.entries[0]?.confidence, "high");
  assert.equal(sure.ok && sure.entries[0]?.source, "午饭三十八块");
});

test("each split keeps its own spoken slice", () => {
  const parsed = parseTranscript("早饭花了¥50打车花了¥20");
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(
    parsed.entries.map((entry) => entry.source),
    ["早饭花了¥50", "打车花了¥20"],
  );
});
