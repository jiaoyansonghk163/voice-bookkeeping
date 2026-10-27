import { serializeBackup, type LedgerState } from "./backup";

/** Download the ledger as a JSON file. Browser only. */
export function exportLedger(ledger: LedgerState) {
  const blob = new Blob([serializeBackup(ledger)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "闪记.json";
  link.click();
  URL.revokeObjectURL(url);
}
