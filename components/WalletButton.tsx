"use client";

import { useState } from "react";
import { useWallet } from "./WalletProvider";
import { shortHash } from "@/lib/validation";

export function WalletButton() {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const switchNetwork = async () => {
    if (switching) return;
    setSwitching(true);
    try {
      await wallet.switchNetwork();
    } catch {
      // WalletProvider stores the normalized error for the visible feedback below.
    } finally {
      setSwitching(false);
    }
  };

  if (wallet.connected) {
    return (
      <div className="wallet-cluster">
        {!wallet.correctNetwork && (
          <button className="network-warning" onClick={switchNetwork} disabled={switching}>
            {switching ? "switching…" : "switch to 61999"}
          </button>
        )}
        <button className="wallet-button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          <span className="wallet-dot" />
          {shortHash(wallet.account ?? "")}
        </button>
        {open && (
          <div className="wallet-popover">
            <span>{wallet.account}</span>
            <button onClick={wallet.disconnect}>disconnect</button>
          </div>
        )}
        {(switching || wallet.error) && (
          <p className={`wallet-switch-feedback${wallet.error ? " error-text" : ""}`} role={wallet.error ? "alert" : "status"} aria-live="polite">
            {switching ? "Switching to Studionet…" : wallet.error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="wallet-cluster">
      <button className="wallet-button" onClick={() => void wallet.connect()}>
        connect wallet
      </button>
      {wallet.error && <p className="wallet-switch-feedback error-text" role="alert">{wallet.error}</p>}
    </div>
  );
}
