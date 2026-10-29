"use client";

import appIcon from "@/public/icon-512.png";

import { useRef, useState } from "react";
import { applyImport, parseBackup, serializeBackup, type ImportMode, type LedgerState } from "@/lib/backup";
import { ChevronRight } from "lucide-react";
import { categoryDetail } from "@/lib/categories";
import { exportLedger } from "@/lib/export";
import { readKeyboardDictation, writeKeyboardDictation } from "@/lib/settings";
import { formatDayGroup, formatYuanTrim } from "@/lib/format";

export function MeScreen({
  ledger,
  demoOn,
  onLoadDemo,
  onClearDemo,
  onImport,
  onOpenBudget,
  onExported,
  canUndoImport = false,
  onUndoImport,
  compact = false,
}: {
  ledger: LedgerState;
  demoOn: boolean;
  onLoadDemo: () => void;
  onClearDemo: () => void;
  onImport: (next: LedgerState) => void;
  onOpenBudget: () => void;
  onExported?: () => void;
  canUndoImport?: boolean;
  onUndoImport?: () => void;
  compact?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const applying = useRef(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<LedgerState | null>(null);
  const [busy, setBusy] = useState(false);
  const [dictation, setDictation] = useState(() => readKeyboardDictation());

  const exportFile = () => {
    exportLedger(ledger);
    onExported?.();
    setNote("已导出,文件不会上传。");
  };

  const [skipped, setSkipped] = useState(0);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const next = parseBackup(await file.text());
    if (!next) {
      setPending(null);
      setNote("这个文件不是闪记的备份,或里面没有可读的账。");
      return;
    }
    applying.current = false;
    setBusy(false);
    setPending(next);
    setSkipped(next.skipped);
    setNote("");
  };

  const apply = (mode: ImportMode) => {
    if (!pending || applying.current) return;
    applying.current = true;
    setBusy(true);
    const result = applyImport(ledger, pending, mode);
    onImport(result.ledger);
    setPending(null);
    setConfirmReplace(false);
    if (mode === "append") {
      setNote(
        result.added === 0
          ? "没有新的账,这份里的都已记过。"
          : result.skipped > 0
            ? `已加进 ${result.added} 笔账,跳过 ${result.skipped} 笔重复。`
            : `已加进 ${result.added} 笔账,只写在这台手机上。`,
      );
      return;
    }
    setNote(`已覆盖为 ${result.added} 笔账,原来的账已另存,可撤销导入。`);
  };

  const cancelPreview = () => {
    if (applying.current) return;
    setConfirmReplace(false);
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
            <img src={appIcon.src} alt="" width={56} height={56} />
          </div>
          <div>
            <b>闪记</b>
            <p>说完,账已记好</p>
          </div>
        </div>
      )}
      <div className="stack">
        <div className="glass set-list">
          <div className="set-row set-toggle">
            <span id="dictation-label">用键盘听写</span>
            <button
              type="button"
              role="switch"
              aria-checked={dictation}
              aria-labelledby="dictation-label"
              aria-describedby="dictation-help"
              className={dictation ? "switch on" : "switch"}
              onClick={() => {
                const next = !dictation;
                setDictation(next);
                writeKeyboardDictation(next);
              }}
            >
              <i />
            </button>
          </div>
          <Row label="预算" onClick={onOpenBudget} />
          <Row label="导出备份" onClick={exportFile} />
          <Row label="导入备份" onClick={() => fileRef.current?.click()} />
          {canUndoImport && onUndoImport ? (
            <Row
              label="撤销导入"
              onClick={() => {
                onUndoImport();
                setNote("已恢复导入前的账。");
              }}
            />
          ) : null}
          <Row label={demoOn ? "移除示例数据" : "载入示例数据"} onClick={demoOn ? onClearDemo : onLoadDemo} />
        </div>
        <p className="fine" id="dictation-help">点说一句时直接弹出键盘,用键盘上的麦克风听写,不会反复询问麦克风权限</p>
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
            <div className="count">共 {pending.transactions.length} 笔账{skipped > 0 ? `,有 ${skipped} 笔读不了,已跳过` : ""}</div>
            {pending.monthlyBudget != null ? <p>预算 {formatYuanTrim(pending.monthlyBudget)}</p> : null}
            <ul className="import-rows">
              {pending.transactions.map((item, index) => (
                <li key={`${item.id}-${index}`}>
                  <span className="name">{item.title}</span>
                  <span className="when">
                    {categoryDetail(item.category, item.subcategory)} · {formatDayGroup(new Date(item.createdAt), new Date())}
                  </span>
                  <span className="amt">{item.kind === "income" ? "+" : ""}¥{formatYuanTrim(item.amount)}</span>
                </li>
              ))}
            </ul>
            <p>{confirmReplace ? "导入会覆盖现有的账,确定吗?" : "加进现有的账:只加新的,预算不动。覆盖现有的账:换成这份,原来的会先另存,可撤销导入。"}</p>
            <div className="import-actions">
              {confirmReplace ? (
                <button type="button" className="quiet-btn accent" disabled={busy} onClick={() => apply("replace")}>
                  确定
                </button>
              ) : (
                <>
                  <button type="button" className="quiet-btn accent" disabled={busy} onClick={() => apply("append")}>
                    加进现有的账
                  </button>
                  <button type="button" className="quiet-btn" disabled={busy} onClick={() => setConfirmReplace(true)}>
                    覆盖现有的账
                  </button>
                </>
              )}
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
