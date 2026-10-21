/** Codex UI copy. Use these strings as written. */
export const VOICE_COPY = {
  listenTitle: "正在聆听",
  listenSubtitle: "说完后点完成",
  quietTitle: "没听到内容",
  quietSubtitle: "点完成或改输入",
  failTitle: "识别未完成",
  failSubtitle: "没有识别到可用内容，请改用打字输入",
  typeInstead: "改用打字",
  done: "完成",
  typeTitle: "手动输入",
  typePlaceholder: "午饭三十八",
  cancel: "取消",
  typeDone: "完成并核对",
  startMic: "开始录音",
  confirmTitle: "请确认账单",
  lowConfidence: "这笔内容可能有误，请重点核对金额、分类和日期",
  confirmOne: "确认记账",
  confirmAll: "全部确认",
  keepEditing: "继续修改",
  amount: "金额",
  category: "分类",
  date: "日期",
  note: "备注",
} as const;

export function confirmSubtitle(count: number): string {
  return `已识别 ${count} 笔，请核对金额、分类和日期`;
}

export function confirmCount(count: number): string {
  return `共 ${count} 笔`;
}
