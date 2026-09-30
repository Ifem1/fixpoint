export type CaseStatus = "OPEN" | "PROVEN" | "CANCELLED";
export type CandidateOutcome = "" | "FIX_PROVEN" | "NOT_FIXED" | "REGRESSION" | "INVALID_PROOF" | "UNPROVEN";

export interface InvariantInput {
  id: string;
  text: string;
}

export interface CaseView {
  case_id: string;
  creator: string;
  repository: string;
  base_sha: string;
  defect_statement: string;
  reproduction_protocol: string;
  failure_signature: string;
  witness_repository: string;
  witness_sha: string;
  witness_path: string;
  base_evidence_url: string;
  protected_paths_json: string;
  invariants_json: string;
  case_digest: string;
  status: CaseStatus;
  created_at: string;
  certificate_candidate_id: string;
  certificate_digest: string;
}

export interface CandidateView {
  candidate_id: string;
  case_id: string;
  submitter: string;
  candidate_sha: string;
  candidate_evidence_url: string;
  support_urls_json: string;
  evidence_digest: string;
  outcome: CandidateOutcome;
  base_defect: string;
  candidate_defect: string;
  witness_integrity: string;
  invariant_fail_ids: string;
  invariant_unproven_ids: string;
  reasoning: string;
  assessment_count: number;
  submitted_at: string;
  assessed_at: string;
}

export interface CertificateView {
  case_id: string;
  case_digest: string;
  base_sha: string;
  candidate_id: string;
  candidate_sha: string;
  witness_sha: string;
  evidence_digest: string;
  certificate_digest: string;
  outcome: "FIX_PROVEN";
}

export interface StatsView {
  cases: number;
  candidates: number;
  proven: number;
}

export interface OpenCaseInput {
  caseId: string;
  repository: string;
  baseSha: string;
  defectStatement: string;
  reproductionProtocol: string;
  failureSignature: string;
  witnessRepository: string;
  witnessSha: string;
  witnessPath: string;
  baseEvidenceUrl: string;
  protectedPaths: string[];
  invariants: InvariantInput[];
}

export interface SubmitCandidateInput {
  candidateId: string;
  caseId: string;
  candidateSha: string;
  candidateEvidenceUrl: string;
  supportUrls: string[];
}

export type TxPhase =
  | "preparing"
  | "awaiting_signature"
  | "submitted"
  | "accepted"
  | "finalized"
  | "failed";

export interface TxJournalEntry {
  hash: string;
  action: string;
  subjectId: string;
  phase: TxPhase;
  createdAt: string;
  statusName?: string;
  executionName?: string;
  error?: string;
}
