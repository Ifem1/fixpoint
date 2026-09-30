"use client";

import { PendingRecovery } from "./PendingRecovery";
import { WalletProvider } from "./WalletProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <PendingRecovery />
      {children}
    </WalletProvider>
  );
}
