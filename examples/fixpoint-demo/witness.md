# Stale signer witness

Target defect: after wallet A is disconnected and wallet B is connected, `currentSigner()` must never return wallet A.

Frozen procedure:
1. reset the session;
2. connect `0xaaaa`;
3. disconnect;
4. connect `0xbbbb`;
5. read `currentSigner()`;
6. require the observed signer to equal `0xbbbb`.

Failure signature: `observed signer 0xaaaa after reconnecting 0xbbbb`.

Protected invariants:
- connecting a wallet makes that wallet the current account;
- explicit disconnect leaves no active signer;
- reconnecting a different wallet selects the new wallet;
- public read state remains callable without an active signer.

The witness text is verification material and should not be edited by a candidate fix.
