"use client";

import { useRef, useState } from "react";
import { applyImport, parseBackup, serializeBackup, type ImportMode, type LedgerState } from "@/lib/backup";
import { ChevronRight } from "lucide-react";
import { categoryDetail } from "@/lib/categories";
import { formatDayGroup, formatYuanTrim } from "@/lib/format";

export function MeScreen({
  ledger,
  demoOn,
  onLoadDemo,
  onClearDemo,
  onImport,
  onOpenBudget,
  compact = false,
}: {
  ledger: LedgerState;
  demoOn: boolean;
  onLoadDemo: () => void;
  onClearDemo: () => void;
  onImport: (next: LedgerState) => void;
  onOpenBudget: () => void;
  compact?: boolean;
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
    link.download = "闪记.json";
    link.click();
    URL.revokeObjectURL(url);
    setNote("已导出,文件不会上传。");
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const next = parseBackup(await file.text());
    if (!next) {
      setPending(null);
      setNote("这个文件不是闪记的备份。");
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
          ? "没有新的账,这份里的都已记过。"
          : result.skipped > 0
            ? `已追加 ${result.added} 笔,跳过 ${result.skipped} 笔重复。`
            : `已追加 ${result.added} 笔,只写在这台设备上。`,
      );
      return;
    }
    setNote(`已替换为 ${result.added} 笔,只写在这台设备上。`);
  };

  const cancelPreview = () => {
    if (applying.current) return;
    setPending(null);
  };

  const Row = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button type="button" className="set-row press" onClick={onClick}>
      <span>{label}</span>
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  );

  return (
    <section className={compact ? "backup" : "me"}>
      {compact ? null : <h1 className="page-title">我的</h1>}
      {compact ? null : (
        <div className="me-head">
          <div className="avatar" aria-hidden="true">
            闪
          </div>
          <div>
            <b>闪记</b>
            <p>说完,账已记好</p>
          </div>
        </div>
      )}
      <div className="stack">
        <div className="glass set-list">
          <Row label="预算" onClick={onOpenBudget} />
          <Row label="导出备份" onClick={exportFile} />
          <Row label="导入备份" onClick={() => fileRef.current?.click()} />
          <Row label={demoOn ? "移除示例数据" : "载入示例数据"} onClick={demoOn ? onClearDemo : onLoadDemo} />
        </div>
        <p className="fine">数据存在这台手机上,建议定期导出备份</p>
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
      {note ? <p className="fine">{note}</p> : null}
    </section>
  );
}
