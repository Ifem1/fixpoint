export function StatusChip({ value }: { value: string }) {
  const className = `status-chip status-${value.toLowerCase().replaceAll("_", "-")}`;
  return <span className={className}>{value || "SUBMITTED"}</span>;
}
