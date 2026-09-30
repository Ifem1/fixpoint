import { CaseWorkspace } from "@/components/CaseWorkspace";

export default async function CasePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const params = await searchParams;
  return <CaseWorkspace initialCaseId={params.id ?? ""} />;
}
