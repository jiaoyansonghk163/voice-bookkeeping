/** Voice strings. Figma labels win where they differ from the earlier Codex sheet. */
export const VOICE_COPY = {
  listenTitle: "正在聆听",
  listenSubtitle: "说完会自动识别 · 也可点麦结束",
  quietTitle: "没听到内容",
  quietSubtitle: "点完成或改输入",
  failTitle: "识别未完成",
  failSubtitle: "没有识别到可用内容，请改用打字输入",
  typeInstead: "改用打字",
  done: "完成",
  typeTitle: "手动输入",
  typeHint: "没听到内容，或识别未完成时用这里补",
  typePlaceholder: "午饭三十八",
  clear: "清空",
  cancel: "取消",
  typeDone: "完成并核对",
  startMic: "开始录音",
  confirmTitle: "请确认账单",
  confirmHint: "未确认不会写入流水",
  lowConfidence: "部分识别不太确定，已标出原文，请核对金额与分类",
  confirmAll: "全部确认",
  delete: "删除",
  amount: "金额",
  category: "分类",
  note: "备注",
} as const;

export function sourceLine(text: string): string {
  return `原文：「${text}」`;
}
