# Hermes XRPL Forge

**Self-Evolving AI Agents that Learn and Improve on the XRP Ledger**

The first open-source framework where autonomous Hermes agents (from Nous Research) analyze their own XRPL performance, autonomously improve their skills, and mint verifiable skill evolutions as NFTs on the ledger.

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/brody4321)

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?logo=buymeacoffee)](https://buymeacoffee.com/brody4321)

---

## 🎯 One-Liner

Hermes agents don't just *use* XRPL — they **get measurably smarter** from every interaction and record their improvements on-chain.

---

## ✨ Core Innovation

While most XRPL agent projects focus on payments (x402, etc.), **Hermes XRPL Forge** adds a true learning loop:

- Agent executes XRPL task → analyzes results → generates improved skill version → mints the evolution as an NFT with performance metadata.
- Creates a public, verifiable "skill marketplace" layer on XRPL.

---

## Live Demo (Testnet)

**Agent Swarm Demo** (3 agents: Planner + Executor + Analyst — score 100/100)

- Payment Tx: [View Tx](https://testnet.xrpl.org/transactions/8D5D527299257CDFB9AD7BD59514A22B5D1734251DDA50A8D5DCFE47334D614E)
- Swarm Evolution NFT: [View NFT](https://testnet.xrpl.org/nft/0008000057CC729258C8324C8F09BE602ECFF676A15398FEA8F29941010A67A8)
- NFT Mint Tx: [View Tx](https://testnet.xrpl.org/transactions/778F83773625B529010F07AF7BDE200E800720420AD91B950F1DC3E17A31CC70)
- Sample logs: [`examples/swarm-sample/`](./examples/swarm-sample/)

**Skill Evolution Demo** (v1 → v2 of payment skill)

- NFT: [View on testnet.xrpl.org](https://testnet.xrpl.org/nft/0008000057CC729258C8324C8F09BE602ECFF676A15398FE920CC843010A67A7)
- Transaction: [View Tx](https://testnet.xrpl.org/transactions/F52DD16D8C8790068DA6AD78068FC96B244E14D0514E50C2DEC2E644CA63FDF9)

**Simple Payment Demo** (earlier)

- Transaction: [View Tx](https://testnet.xrpl.org/transactions/4DD81CC29D1BDDDF2D33AEAD9B7F099CC55EFADB53F7AAA8DD190C9D4CF392EC)

---

## Features

- ✅ Autonomous XRP payments with rich memos
- ✅ Self-improving skills with retry logic, logging & safety checks
- ✅ Automatic NFT minting of skill evolutions (with performance metadata)
- ✅ Multi-agent swarm orchestration (Planner → Executor → Analyst) with on-chain performance NFT
- ✅ Clean, professional output ready for demos/grants
- ✅ Fully local + testnet (no real tokens required)

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/cleonard2341/hermes-xrpl-forge.git
cd hermes-xrpl-forge

# 2. Install dependencies
npm install

# 3. Copy the example wallet, then edit with your testnet seed
#    Get a funded testnet wallet from https://xrpl.org/xrp-testnet-faucet.html
cp wallet/xrpl-wallet.txt.example wallet/xrpl-wallet.txt

# 4. Run the full demo (payment → skill evolution mint)
node demos/demo-full-run.mjs
```

Full setup notes: see [`setup.md`](./setup.md).

---

## Project Structure

```
hermes-xrpl-forge/
├── skills/                  # Core XRPL skills
├── demos/                   # Ready-to-run demos (incl. 3-agent swarm)
├── skill-evolutions/        # Generated improved versions + metadata
├── examples/                # Sample outputs from a real run
├── wallet/                  # (gitignored) wallet credentials
└── README.md
```

---

## Skills

### `xrpl_send_payment` (v2)

Send XRP on the testnet with retry, structured logging, memo, destination pre-flight, fee visibility, and balance delta.

```bash
node skills/xrpl_send_payment.mjs <destination_address> <amount_xrp> [memo]
```

### `xrpl_mint_skill_evolution`

Mint an `NFTokenMint` transaction whose URI is a compact base64 data URI encoding a skill's evolution metadata. Defaults to `skill-evolutions/evolution-metadata.json`.

```bash
node skills/xrpl_mint_skill_evolution.mjs [path/to/metadata.json]
```

The NFT is `tfTransferable` (Flags: 8), Taxon: 1. View it under your wallet at `https://testnet.xrpl.org`.

---

## Why On-Chain?

Self-improving agents need an audit trail that isn't owned by the agent. The XRPL ledger gives you:

- **Timestamp** — when the evolution happened, ordered by ledger index.
- **Provenance** — which account claimed authorship.
- **Tamper-evidence** — the metadata payload is bound to the NFT.
- **Public verifiability** — anyone can fetch the NFT and decode its URI.

`evolution-metadata.json` captures the *full* record (features, limitations, deltas); the NFT URI carries a compact summary that fits within XRPL's 256-byte URI limit and points to the canonical metadata.

---

## Network

All scripts target the XRPL **Testnet**:

- WebSocket: `wss://s.altnet.rippletest.net:51233`
- Explorer:  `https://testnet.xrpl.org`

---

## Security

`wallet/xrpl-wallet.txt` is gitignored. Only the `.example` template is committed. **Do not commit real seeds.** Even though this is testnet, treat the workflow as if it were mainnet — habits transfer.

---

## License

MIT License — feel free to fork, improve, and build on top.
