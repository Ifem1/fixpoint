import Link from "next/link";
import type { CaseView } from "@/lib/types";
import { StatusChip } from "./StatusChip";
import { shortHash } from "@/lib/validation";

export function CaseCard({ item }: { item: CaseView }) {
  return (
    <Link className="case-card" href={`/case?id=${encodeURIComponent(item.case_id)}`}>
      <div className="case-card-top">
        <span className="case-id">{item.case_id}</span>
        <StatusChip value={item.status} />
      </div>
      <h2>{item.defect_statement}</h2>
      <div className="case-meta">
        <span>base <code>{shortHash(item.base_sha)}</code></span>
        <span>witness <code>{shortHash(item.witness_sha)}</code></span>
      </div>
      <div className="case-card-foot">
        <span>{item.repository.replace("https://github.com/", "")}</span>
        <span>inspect →</span>
      </div>
    </Link>
  );
}
