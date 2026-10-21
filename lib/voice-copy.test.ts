import assert from "node:assert/strict";
import test from "node:test";
import { parseTranscript } from "./parse-transcript";
import { VOICE_COPY, confirmCount, confirmSubtitle } from "./voice-copy";

test("confirm copy matches the Codex strings", () => {
  assert.equal(VOICE_COPY.listenTitle, "正在聆听");
  assert.equal(VOICE_COPY.listenSubtitle, "说完后点完成");
  assert.equal(VOICE_COPY.quietTitle, "没听到内容");
  assert.equal(VOICE_COPY.quietSubtitle, "点完成或改输入");
  assert.equal(VOICE_COPY.failTitle, "识别未完成");
  assert.equal(VOICE_COPY.failSubtitle, "没有识别到可用内容，请改用打字输入");
  assert.equal(VOICE_COPY.typeInstead, "改用打字");
  assert.equal(VOICE_COPY.typeTitle, "手动输入");
  assert.equal(VOICE_COPY.typePlaceholder, "午饭三十八");
  assert.equal(VOICE_COPY.typeDone, "完成并核对");
  assert.equal(VOICE_COPY.startMic, "开始录音");
  assert.equal(VOICE_COPY.confirmTitle, "请确认账单");
  assert.equal(confirmSubtitle(2), "已识别 2 笔，请核对金额、分类和日期");
  assert.equal(VOICE_COPY.lowConfidence, "这笔内容可能有误，请重点核对金额、分类和日期");
  assert.equal(confirmCount(3), "共 3 笔");
  assert.equal(VOICE_COPY.confirmOne, "确认记账");
  assert.equal(VOICE_COPY.confirmAll, "全部确认");
  assert.equal(VOICE_COPY.keepEditing, "继续修改");
});

test("a bare amount is low confidence and a unit amount is not", () => {
  const bare = parseTranscript("咖啡二十八");
  const sure = parseTranscript("午饭三十八块");
  assert.equal(bare.ok && bare.entries[0]?.confidence, "low");
  assert.equal(sure.ok && sure.entries[0]?.confidence, "high");
});
