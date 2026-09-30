"use client";

import { useState } from "react";
import { useWallet } from "./WalletProvider";
import { shortHash } from "@/lib/validation";

export function WalletButton() {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);

  if (wallet.connected) {
    return (
      <div className="wallet-cluster">
        {!wallet.correctNetwork && (
          <button className="network-warning" onClick={() => void wallet.switchNetwork()}>
            switch to 61999
          </button>
        )}
        <button className="wallet-button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          <span className="wallet-dot" />
          {shortHash(wallet.account ?? "")}
        </button>
        {open && (
          <div className="wallet-popover">
            <strong>{wallet.walletName ?? "Injected wallet"}</strong>
            <span>{wallet.account}</span>
            <button onClick={wallet.disconnect}>disconnect</button>
          </div>
        )}
      </div>
    );
  }

  if (wallet.wallets.length <= 1) {
    return (
      <button className="wallet-button" onClick={() => void wallet.connect()}>
        connect wallet
      </button>
    );
  }

  return (
    <div className="wallet-cluster">
      <button className="wallet-button" onClick={() => setOpen((value) => !value)}>
        connect wallet
      </button>
      {open && (
        <div className="wallet-popover wallet-list">
          {wallet.wallets.map((item) => (
            <button key={item.uuid} onClick={() => void wallet.connect(item.uuid)}>
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
