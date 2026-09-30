import Link from "next/link";
import { WalletButton } from "./WalletButton";
import { NETWORK } from "@/lib/network";
import { contractConfigured, FIXPOINT_CONTRACT_ADDRESS } from "@/lib/config";
import { shortHash } from "@/lib/validation";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true"><i /><i /></span>
          FIXPOINT
        </Link>
        <nav className="primary-nav" aria-label="Primary navigation">
          <Link href="/cases">cases</Link>
          <Link href="/open">open case</Link>
          <Link href="/how">protocol</Link>
        </nav>
        <WalletButton />
      </header>
      <div className="network-line">
        <span><b>LIVE TARGET</b> {NETWORK.shortName} · chain {NETWORK.chainId}</span>
        <span>{contractConfigured ? `contract ${shortHash(FIXPOINT_CONTRACT_ADDRESS ?? "")}` : "contract pending deployment"}</span>
      </div>
      {!contractConfigured && (
        <div className="configuration-banner">
          Contract source is ready, but this frontend has not been pointed at a deployed address yet. Reads and writes remain disabled until deployment configuration is supplied.
        </div>
      )}
      <main>{children}</main>
      <footer className="footer">
        <span>FIXPOINT · revision-bound software fix verification</span>
        <span>contract state is canonical</span>
      </footer>
    </div>
  );
}
