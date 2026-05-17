# Setup

## 1. Install dependencies

```bash
npm install
```

Only one runtime dependency: `xrpl` (the official JavaScript XRPL SDK).

## 2. Get a funded XRPL Testnet wallet

Visit the XRPL Testnet Faucet and click "Generate Testnet Credentials":

> https://xrpl.org/xrp-testnet-faucet.html

The faucet returns an `Address`, a `Secret` (seed), and pre-funds the wallet with test XRP.

## 3. Save your seed

Copy the example wallet file and fill in the values shown by the faucet:

```bash
cp wallet/xrpl-wallet.txt.example wallet/xrpl-wallet.txt
```

Edit `wallet/xrpl-wallet.txt` and replace the placeholders. Only the `Seed:` line is parsed by the scripts. The real file is gitignored — **never commit a real seed**.

## 4. Run the demos

```bash
npm run demo:payment     # send 1 XRP with a memo and show balance delta
npm run demo:evolution   # mint a skill-evolution NFT on testnet
npm run demo:swarm       # 3-agent swarm: Planner → Executor → Analyst (+ mints Swarm NFT)
npm run demo:full        # payment + evolution, in sequence
```

The swarm demo writes runtime logs to `swarm-logs/` and run snapshots to `swarm-demos/`. Both dirs are gitignored. A snapshot of a real run lives at `examples/swarm-sample/`.

Or call the skills directly:

```bash
node skills/xrpl_send_payment.mjs <destination> <amount_xrp> [memo]
node skills/xrpl_mint_skill_evolution.mjs [path/to/metadata.json]
```

## Network

Everything points at the XRPL Testnet WebSocket: `wss://s.altnet.rippletest.net:51233`.
Transactions show up at https://testnet.xrpl.org.
