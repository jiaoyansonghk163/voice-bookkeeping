import { LedgerApp } from "@/components/ledger-app";
import { SAMPLE_IDS } from "@/lib/sample-data";

export const dynamicParams = false;

const STATIC_PAGES = ["stats", "categories", "budget", "me", "all"];

export function generateStaticParams() {
  return [
    { slug: [] },
    ...STATIC_PAGES.map((page) => ({ slug: [page] })),
    ...SAMPLE_IDS.map((id) => ({ slug: ["tx", id] })),
  ];
}

export default function Page() {
  return <LedgerApp />;
}
