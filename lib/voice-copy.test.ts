import assert from "node:assert/strict";
import test from "node:test";
import { parseTranscript } from "./parse-transcript";
import { VOICE_COPY, sourceLine } from "./voice-copy";

test("voice copy keeps the Figma labels and the Codex fallback lines", () => {
  assert.equal(VOICE_COPY.listenTitle, "正在聆听");
  assert.equal(VOICE_COPY.listenSubtitle, "说完会自动识别 · 也可点麦结束");
  assert.equal(VOICE_COPY.quietTitle, "没听到内容");
  assert.equal(VOICE_COPY.quietSubtitle, "点完成或改输入");
  assert.equal(VOICE_COPY.failTitle, "识别未完成");
  assert.equal(VOICE_COPY.failSubtitle, "没有识别到可用内容，请改用打字输入");
  assert.equal(VOICE_COPY.typeInstead, "改用打字");
  assert.equal(VOICE_COPY.typeTitle, "手动输入");
  assert.equal(VOICE_COPY.typeHint, "没听到内容，或识别未完成时用这里补");
  assert.equal(VOICE_COPY.typePlaceholder, "午饭三十八");
  assert.equal(VOICE_COPY.clear, "清空");
  assert.equal(VOICE_COPY.typeDone, "完成并核对");
  assert.equal(VOICE_COPY.startMic, "开始录音");
  assert.equal(VOICE_COPY.confirmTitle, "请确认账单");
  assert.equal(VOICE_COPY.confirmHint, "未确认不会写入流水");
  assert.equal(VOICE_COPY.lowConfidence, "部分识别不太确定，已标出原文，请核对金额与分类");
  assert.equal(VOICE_COPY.cancel, "取消");
  assert.equal(VOICE_COPY.confirmAll, "全部确认");
  assert.equal(sourceLine("地铁十二块五"), "原文：「地铁十二块五」");
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
