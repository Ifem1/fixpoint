import { createClient } from "genlayer-js";
import { TransactionStatus } from "genlayer-js/types";
import { studionet } from "genlayer-js/chains";
import { FIXPOINT_CONTRACT_ADDRESS } from "./config";
import type { Eip1193Provider } from "./wallet";
import type {
  CaseView,
  CandidateView,
  CertificateView,
  OpenCaseInput,
  StatsView,
  SubmitCandidateInput,
} from "./types";

const readClient = createClient({ chain: studionet });

function requireAddress() {
  if (!FIXPOINT_CONTRACT_ADDRESS) {
    throw new Error("FIXPOINT contract is not configured. Set NEXT_PUBLIC_FIXPOINT_CONTRACT_ADDRESS.");
  }
  return FIXPOINT_CONTRACT_ADDRESS as `0x${string}`;
}

type SdkProvider = NonNullable<Parameters<typeof createClient>[0]>["provider"];

function writeClient(account: string, provider: Eip1193Provider) {
  return createClient({
    chain: studionet,
    account: account as `0x${string}`,
    provider: provider as SdkProvider,
  });
}

export async function readStats(): Promise<StatsView> {
  return (await readClient.readContract({
    address: requireAddress(),
    functionName: "get_stats",
    args: [],
  })) as unknown as StatsView;
}

export async function listCaseIds(offset = 0, limit = 50): Promise<string[]> {
  return (await readClient.readContract({
    address: requireAddress(),
    functionName: "list_case_ids",
    args: [offset, limit],
  })) as unknown as string[];
}

export async function readCase(caseId: string): Promise<CaseView> {
  return (await readClient.readContract({
    address: requireAddress(),
    functionName: "get_case",
    args: [caseId],
  })) as unknown as CaseView;
}

export async function listCandidateIds(caseId: string): Promise<string[]> {
  return (await readClient.readContract({
    address: requireAddress(),
    functionName: "list_candidate_ids",
    args: [caseId],
  })) as unknown as string[];
}

export async function readCandidate(candidateId: string): Promise<CandidateView> {
  return (await readClient.readContract({
    address: requireAddress(),
    functionName: "get_candidate",
    args: [candidateId],
  })) as unknown as CandidateView;
}

export async function readCertificate(caseId: string): Promise<CertificateView> {
  return (await readClient.readContract({
    address: requireAddress(),
    functionName: "get_certificate",
    args: [caseId],
  })) as unknown as CertificateView;
}

export async function openCaseTx(account: string, provider: Eip1193Provider, input: OpenCaseInput) {
  return writeClient(account, provider).writeContract({
    address: requireAddress(),
    functionName: "open_case",
    value: 0n,
    args: [
      input.caseId,
      input.repository,
      input.baseSha,
      input.defectStatement,
      input.reproductionProtocol,
      input.failureSignature,
      input.witnessRepository,
      input.witnessSha,
      input.witnessPath,
      input.baseEvidenceUrl,
      JSON.stringify(input.protectedPaths),
      JSON.stringify(input.invariants),
    ],
  });
}

export async function submitCandidateTx(
  account: string,
  provider: Eip1193Provider,
  input: SubmitCandidateInput,
) {
  return writeClient(account, provider).writeContract({
    address: requireAddress(),
    functionName: "submit_candidate",
    value: 0n,
    args: [
      input.candidateId,
      input.caseId,
      input.candidateSha,
      input.candidateEvidenceUrl,
      JSON.stringify(input.supportUrls),
    ],
  });
}

export async function assessCandidateTx(account: string, provider: Eip1193Provider, candidateId: string) {
  return writeClient(account, provider).writeContract({
    address: requireAddress(),
    functionName: "assess_candidate",
    value: 0n,
    args: [candidateId],
  });
}

export async function cancelCaseTx(account: string, provider: Eip1193Provider, caseId: string) {
  return writeClient(account, provider).writeContract({
    address: requireAddress(),
    functionName: "cancel_case",
    value: 0n,
    args: [caseId],
  });
}

function txNames(transaction: unknown) {
  const record = transaction as Record<string, unknown>;
  return {
    statusName: String(record.statusName ?? record.status_name ?? record.status ?? ""),
    executionName: String(record.txExecutionResultName ?? record.tx_execution_result_name ?? ""),
  };
}

export async function waitForDecision(hash: string) {
  const transaction = await readClient.waitForTransactionReceipt({
    hash: hash as `0x${string}`,
    status: TransactionStatus.ACCEPTED,
  });
  return { transaction, ...txNames(transaction) };
}

export async function waitForFinalization(hash: string) {
  const transaction = await readClient.waitForTransactionReceipt({
    hash: hash as `0x${string}`,
    status: TransactionStatus.FINALIZED,
  });
  return { transaction, ...txNames(transaction) };
}

export async function getTransaction(hash: string) {
  const transaction = await readClient.getTransaction({ hash: hash as `0x${string}` });
  return { transaction, ...txNames(transaction) };
}
