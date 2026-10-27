/** Voice strings. Source: copy.md (闪记 界面文案 v1). */
export const VOICE_COPY = {
  sheetTitle: "说一句",
  listenTitle: "正在听…",
  listenSubtitle: "比如:午饭 28 块,打车 15",
  quietTitle: "没听清,再说一次?",
  quietSubtitle: "比如:午饭 28 块,打车 15",
  failTitle: "没听清,再说一次?",
  failSubtitle: "",
  typeInstead: "手动记一笔",
  retake: "重说",
  done: "说完了",
  typeTitle: "记一笔",
  typeHint: "写一句,比如:午饭 28 块",
  typePlaceholder: "午饭 28 块",
  dictationPlaceholder: "点键盘上的麦克风说话,比如:午饭 28 块",
  clear: "清空",
  cancel: "取消",
  typeDone: "记下",
  startMic: "说一句",
  confirmTitle: "听到了…",
  confirmHint: "点开每一笔可以修改",
  lowConfidence: "部分内容不太确定,请核对金额与分类",
  confirmAll: "记下",
  delete: "删除",
  amount: "金额",
  category: "分类",
  note: "备注",
} as const;

export function sourceLine(text: string): string {
  return `听到了:${text}`;
}
