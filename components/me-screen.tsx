"use client";

import { useRef, useState } from "react";
import { applyImport, parseBackup, serializeBackup, type ImportMode, type LedgerState } from "@/lib/backup";
import { categoryDetail } from "@/lib/categories";
import { formatDayGroup, formatYuanTrim } from "@/lib/format";

export function MeScreen({
  ledger,
  demoOn,
  onLoadDemo,
  onClearDemo,
  onImport,
  onOpenBudget,
}: {
  ledger: LedgerState;
  demoOn: boolean;
  onLoadDemo: () => void;
  onClearDemo: () => void;
  onImport: (next: LedgerState) => void;
  onOpenBudget: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const applying = useRef(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<LedgerState | null>(null);
  const [busy, setBusy] = useState(false);

  const exportFile = () => {
    const blob = new Blob([serializeBackup(ledger)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "语音记账.json";
    link.click();
    URL.revokeObjectURL(url);
    setNote("已下载到本机，文件不会上传。");
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const next = parseBackup(await file.text());
    if (!next) {
      setPending(null);
      setNote("这个文件不是语音记账的备份。");
      return;
    }
    applying.current = false;
    setBusy(false);
    setPending(next);
    setNote("");
  };

  const apply = (mode: ImportMode) => {
    if (!pending || applying.current) return;
    applying.current = true;
    setBusy(true);
    const result = applyImport(ledger, pending, mode);
    onImport(result.ledger);
    setPending(null);
    if (mode === "append") {
      setNote(
        result.added === 0
          ? "没有新账单。这份里的都已在账上。"
          : result.skipped > 0
            ? `已追加 ${result.added} 笔，跳过 ${result.skipped} 笔重复。`
            : `已追加 ${result.added} 笔，只写在这台设备上。`,
      );
      return;
    }
    setNote(`已替换为 ${result.added} 笔，只写在这台设备上。`);
  };

  const cancelPreview = () => {
    if (applying.current) return;
    setPending(null);
  };

  return (
    <section className="panel block rise me">
      <div className="avatar" aria-hidden="true">
        CA
      </div>
      <h2>我的</h2>
      <p>账单只存在这台设备的浏览器里，不上传，也没有统计代码。</p>
      <div className="stack">
        <button type="button" className="quiet-btn" onClick={onOpenBudget}>
          预算
        </button>
        <button type="button" className="quiet-btn" onClick={exportFile}>
          导出账单
        </button>
        <button type="button" className="quiet-btn" onClick={() => fileRef.current?.click()}>
          导入账单
        </button>
        <input
          ref={fileRef}
          className="file"
          type="file"
          accept="application/json,.json"
          aria-label="选择备份文件"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void importFile(file);
          }}
        />
        {pending ? (
          <div className="import-preview" role="region" aria-label="导入预览">
            <div className="count">共 {pending.transactions.length} 笔</div>
            {pending.monthlyBudget != null ? <p>预算 {formatYuanTrim(pending.monthlyBudget)}</p> : null}
            <ul className="import-rows">
              {pending.transactions.map((item, index) => (
                <li key={`${item.id}-${index}`}>
                  <span className="name">{item.title}</span>
                  <span className="when">
                    {categoryDetail(item.category, item.subcategory)} · {formatDayGroup(new Date(item.createdAt), new Date())}
                  </span>
                  <span className="amt">¥{formatYuanTrim(item.amount)}</span>
                </li>
              ))}
            </ul>
            <p>追加只加账单，预算不动。替换整份换掉。</p>
            <div className="import-actions">
              <button type="button" className="quiet-btn accent" disabled={busy} onClick={() => apply("append")}>
                追加
              </button>
              <button type="button" className="quiet-btn" disabled={busy} onClick={() => apply("replace")}>
                替换
              </button>
            </div>
            <button type="button" className="import-cancel" disabled={busy} onClick={cancelPreview}>
              取消
            </button>
          </div>
        ) : null}
      </div>
      <p className="fine">示例数据是可选的虚构账单，用来看看界面，可以随时去掉。</p>
      {demoOn ? (
        <button type="button" className="quiet-btn" onClick={onClearDemo}>
          移除示例数据
        </button>
      ) : (
        <button type="button" className="quiet-btn" onClick={onLoadDemo}>
          载入示例数据
        </button>
      )}
      {note ? <p className="fine">{note}</p> : null}
    </section>
  );
}
