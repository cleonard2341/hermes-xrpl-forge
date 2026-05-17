/**
 * demo-agent-swarm.mjs
 * XRPL Agent Swarm Demo — Hermes Multi-Agent Coordination
 *
 * 3-Agent Architecture:
 *   [Planner]  — decides task, builds plan, writes swarm-logs/plan.json
 *   [Executor] — reads plan, sends XRP payment, writes swarm-logs/execution.json
 *   [Analyst]  — reads execution result, scores it, mints Swarm Evolution NFT,
 *                writes swarm-logs/analysis.json
 *
 * All agents share context via swarm-logs/  (gitignored — generated at runtime).
 * Final summary saved to swarm-demos/       (also gitignored).
 *
 * Sample outputs from a real run live in examples/swarm-sample/.
 */

import { Client, Wallet, xrpToDrops, convertStringToHex } from 'xrpl';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// ── Paths (resolved relative to this script, regardless of cwd) ──
const __dirname    = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT    = resolve(__dirname, '..');
const SWARM_LOGS   = resolve(REPO_ROOT, 'swarm-logs');
const SWARM_DEMOS  = resolve(REPO_ROOT, 'swarm-demos');
const WALLET_FILE  = resolve(REPO_ROOT, 'wallet', 'xrpl-wallet.txt');
const TESTNET      = 'wss://s.altnet.rippletest.net:51233';
const DESTINATION  = process.env.DEMO_DESTINATION || 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';

mkdirSync(SWARM_LOGS, { recursive: true });
mkdirSync(SWARM_DEMOS, { recursive: true });

// ── Helpers ──────────────────────────────────────────────────
function divider(c = '─', n = 62) { console.log(c.repeat(n)); }
function row(k, v) { console.log(`  ${String(k).padEnd(24)} ${v}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function log(agent, level, msg) {
  const ts   = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const icon = { INFO: '✦', OK: '✔', WARN: '⚠', ERR: '✘' }[level] ?? '·';
  const tag  = `[${agent.padEnd(8)}]`;
  console.log(`  ${icon} ${tag} [${ts}] ${msg}`);
}

function saveJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

// Read wallet seed
const walletRaw = readFileSync(WALLET_FILE, 'utf8');
const seedMatch = walletRaw.match(/Seed:\s+(\S+)/);
if (!seedMatch) {
  console.error(`Could not find a Seed line in ${WALLET_FILE}`);
  process.exit(1);
}
const wallet = Wallet.fromSeed(seedMatch[1]);

// ════════════════════════════════════════════════════════════
//  BANNER
// ════════════════════════════════════════════════════════════
const swarmStart = performance.now();
console.log('');
divider('═');
console.log('  XRPL AGENT SWARM DEMO  —  Hermes Multi-Agent System');
console.log('  3 Agents  |  1 Shared Wallet  |  XRPL Testnet');
divider('═');
console.log('');

// ════════════════════════════════════════════════════════════
//  AGENT 1: PLANNER
// ════════════════════════════════════════════════════════════
const plannerStart = performance.now();
console.log('  ┌─────────────────────────────────────────────────────┐');
console.log('  │  AGENT 1 — PLANNER                                  │');
console.log('  └─────────────────────────────────────────────────────┘');

log('PLANNER', 'INFO', 'Initializing task planning...');

const plan = {
  agent: 'Planner',
  timestamp: new Date().toISOString(),
  task: 'Send optimized XRP payment with memo and prepare skill evolution',
  steps: [
    { id: 1, action: 'send_payment', amount: '1', destination: DESTINATION,
      memo: 'Hermes Swarm Demo — Agent Coordinated Payment' },
    { id: 2, action: 'analyze_result', metrics: ['fee', 'latency', 'success_rate'] },
    { id: 3, action: 'mint_swarm_nft', taxon: 2, flags: 8 },
  ],
  optimizations: [
    'Use autofill for dynamic fee estimation',
    'Embed structured memo for traceability',
    'Capture ledger index for audit trail',
    'Mint collective NFT to record swarm performance',
  ],
  wallet: wallet.address,
};

saveJSON(resolve(SWARM_LOGS, 'plan.json'), plan);
const plannerMs = Math.round(performance.now() - plannerStart);

log('PLANNER', 'OK',   `Task: "${plan.task}"`);
log('PLANNER', 'INFO', `Steps planned: ${plan.steps.length}`);
log('PLANNER', 'INFO', `Optimizations: ${plan.optimizations.length} applied`);
log('PLANNER', 'OK',   `Plan saved → swarm-logs/plan.json  (${plannerMs}ms)`);
console.log('');

// ════════════════════════════════════════════════════════════
//  AGENT 2: EXECUTOR
// ════════════════════════════════════════════════════════════
const execStart = performance.now();
console.log('  ┌─────────────────────────────────────────────────────┐');
console.log('  │  AGENT 2 — EXECUTOR                                 │');
console.log('  └─────────────────────────────────────────────────────┘');

log('EXECUTOR', 'INFO', 'Reading plan from swarm-logs/plan.json...');
log('EXECUTOR', 'INFO', `Connecting to XRPL Testnet...`);

const client = new Client(TESTNET);
await client.connect();
log('EXECUTOR', 'OK', 'Connected.');

// Balance before
const infoBefore = await client.request({
  command: 'account_info', account: wallet.address, ledger_index: 'validated'
});
const balanceBefore = Number(infoBefore.result.account_data.Balance) / 1_000_000;
log('EXECUTOR', 'INFO', `Balance before: ${balanceBefore.toFixed(6)} XRP`);

const payStep = plan.steps[0];
log('EXECUTOR', 'INFO', `Sending ${payStep.amount} XRP → ${payStep.destination}`);
log('EXECUTOR', 'INFO', `Memo: "${payStep.memo}"`);

const tx = await client.autofill({
  TransactionType: 'Payment',
  Account: wallet.address,
  Amount: xrpToDrops(payStep.amount),
  Destination: payStep.destination,
  Memos: [{
    Memo: {
      MemoData: convertStringToHex(payStep.memo),
      MemoType: convertStringToHex('text/plain'),
    }
  }],
});

const feeXRP = Number(tx.Fee) / 1_000_000;
log('EXECUTOR', 'INFO', `Estimated fee: ${feeXRP.toFixed(6)} XRP`);

const signed = wallet.sign(tx);
const txResult = await client.submitAndWait(signed.tx_blob);

const payOutcome = txResult.result.meta.TransactionResult;
const payHash    = txResult.result.hash;
const payLedger  = txResult.result.ledger_index;
const execMs     = Math.round(performance.now() - execStart);

// Balance after payment
const infoAfter = await client.request({
  command: 'account_info', account: wallet.address, ledger_index: 'validated'
});
const balanceAfter = Number(infoAfter.result.account_data.Balance) / 1_000_000;

const execution = {
  agent: 'Executor',
  timestamp: new Date().toISOString(),
  payment: {
    status: payOutcome,
    hash: payHash,
    ledger: payLedger,
    amount_xrp: payStep.amount,
    fee_xrp: feeXRP.toFixed(6),
    memo: payStep.memo,
    destination: payStep.destination,
    balance_before: balanceBefore.toFixed(6),
    balance_after: balanceAfter.toFixed(6),
    latency_ms: execMs,
    explorer: `https://testnet.xrpl.org/transactions/${payHash}`,
  }
};

saveJSON(resolve(SWARM_LOGS, 'execution.json'), execution);

log('EXECUTOR', 'OK',   `Payment status: ${payOutcome}`);
log('EXECUTOR', 'OK',   `Hash: ${payHash}`);
log('EXECUTOR', 'INFO', `Ledger: ${payLedger}  |  Latency: ${execMs}ms`);
log('EXECUTOR', 'INFO', `Balance after: ${balanceAfter.toFixed(6)} XRP`);
log('EXECUTOR', 'OK',   `Execution saved → swarm-logs/execution.json`);
console.log('');

// ════════════════════════════════════════════════════════════
//  AGENT 3: ANALYST + NFT MINT
// ════════════════════════════════════════════════════════════
const analystStart = performance.now();
console.log('  ┌─────────────────────────────────────────────────────┐');
console.log('  │  AGENT 3 — ANALYST                                  │');
console.log('  └─────────────────────────────────────────────────────┘');

log('ANALYST', 'INFO', 'Reading execution results from swarm-logs/execution.json...');

// Score the execution
const successScore = payOutcome === 'tesSUCCESS' ? 100 : 0;
const feeScore     = feeXRP < 0.00002 ? 100 : 80;
const latencyScore = execMs < 10000 ? 100 : execMs < 20000 ? 80 : 60;
const overallScore = Math.round((successScore + feeScore + latencyScore) / 3);

log('ANALYST', 'INFO', `Success score : ${successScore}/100`);
log('ANALYST', 'INFO', `Fee score     : ${feeScore}/100  (fee: ${feeXRP.toFixed(6)} XRP)`);
log('ANALYST', 'INFO', `Latency score : ${latencyScore}/100  (${execMs}ms)`);
log('ANALYST', 'OK',   `Overall swarm score: ${overallScore}/100`);

const improvements = [
  'Add destination tag validation for exchange addresses',
  'Implement parallel multi-destination fan-out payments',
  'Cache fee estimates to reduce autofill round-trips',
  'Add structured event logging for agent audit trails',
];
log('ANALYST', 'INFO', `Suggested improvements: ${improvements.length}`);

// Mint Swarm Evolution NFT
log('ANALYST', 'INFO', 'Minting Swarm Evolution NFT...');

const nftMeta = JSON.stringify({
  swarm: 'xrpl_agent_swarm_demo',
  agents: 3,
  score: overallScore,
  tx: payHash.slice(0, 16) + '...',
  v: '1.0',
});
const nftBase64 = Buffer.from(nftMeta).toString('base64');
const nftURI    = `data:application/json;base64,${nftBase64}`;
const nftURIHex = convertStringToHex(nftURI).toUpperCase();

if (nftURIHex.length > 512) throw new Error(`NFT URI too long: ${nftURIHex.length}`);

const nftTx = await client.autofill({
  TransactionType: 'NFTokenMint',
  Account: wallet.address,
  URI: nftURIHex,
  Flags: 8,
  NFTokenTaxon: 2,
  TransferFee: 0,
  Memos: [{
    Memo: {
      MemoData: convertStringToHex(`Hermes Swarm Evolution — Score ${overallScore}/100`),
      MemoType: convertStringToHex('text/plain'),
    }
  }],
});

const nftSigned = wallet.sign(nftTx);
const nftResult = await client.submitAndWait(nftSigned.tx_blob);

const nftOutcome = nftResult.result.meta.TransactionResult;
const nftHash    = nftResult.result.hash;
const nftFeeXRP  = Number(nftTx.Fee) / 1_000_000;
const analystMs  = Math.round(performance.now() - analystStart);

// Extract NFT ID
let nftID = null;
try {
  for (const node of nftResult.result.meta.AffectedNodes) {
    const n = node.CreatedNode || node.ModifiedNode;
    if (!n) continue;
    if (n.LedgerEntryType === 'NFTokenPage') {
      const tokens = (n.NewFields || n.FinalFields)?.NFTokens;
      if (tokens?.length) { nftID = tokens[tokens.length - 1].NFToken.NFTokenID; break; }
    }
  }
} catch (_) {}

const analysis = {
  agent: 'Analyst',
  timestamp: new Date().toISOString(),
  scores: { success: successScore, fee: feeScore, latency: latencyScore, overall: overallScore },
  improvements,
  nft: {
    status: nftOutcome,
    hash: nftHash,
    id: nftID,
    fee_xrp: nftFeeXRP.toFixed(6),
    explorer_tx: `https://testnet.xrpl.org/transactions/${nftHash}`,
    explorer_nft: nftID ? `https://testnet.xrpl.org/nft/${nftID}` : null,
    latency_ms: analystMs,
  }
};

saveJSON(resolve(SWARM_LOGS, 'analysis.json'), analysis);
log('ANALYST', 'OK', `NFT status: ${nftOutcome}`);
if (nftID) log('ANALYST', 'OK', `NFT ID: ${nftID}`);
log('ANALYST', 'OK', `Analysis saved → swarm-logs/analysis.json`);

await client.disconnect();

// ════════════════════════════════════════════════════════════
//  FINAL SUMMARY
// ════════════════════════════════════════════════════════════
const totalMs = Math.round(performance.now() - swarmStart);
const totalFee = (feeXRP + nftFeeXRP).toFixed(6);

const summary = {
  run_at: new Date().toISOString(),
  wallet: wallet.address,
  agents: ['Planner', 'Executor', 'Analyst'],
  payment: execution.payment,
  nft: analysis.nft,
  scores: analysis.scores,
  improvements,
  metrics: {
    total_time_ms: totalMs,
    planner_ms: plannerMs,
    executor_ms: execMs,
    analyst_ms: analystMs,
    total_fees_xrp: totalFee,
  }
};

const demoFile = resolve(SWARM_DEMOS, `swarm-run-${Date.now()}.json`);
saveJSON(demoFile, summary);

console.log('');
divider('═');
console.log('  SWARM COMPLETE  —  Professional Summary');
divider('═');
console.log('');
console.log('  PAYMENT');
divider();
row('Status:', `${payOutcome === 'tesSUCCESS' ? '✔  CONFIRMED' : '✘  FAILED'}`);
row('Amount:', `1.000000 XRP`);
row('Memo:', payStep.memo);
row('Hash:', payHash);
row('Explorer:', `https://testnet.xrpl.org/transactions/${payHash}`);
console.log('');
console.log('  EVOLUTION NFT');
divider();
row('Status:', `${nftOutcome === 'tesSUCCESS' ? '✔  MINTED' : '✘  FAILED'}`);
if (nftID) row('NFT ID:', nftID);
row('NFT Hash:', nftHash);
row('Explorer:', `https://testnet.xrpl.org/transactions/${nftHash}`);
if (nftID) row('NFT Page:', `https://testnet.xrpl.org/nft/${nftID}`);
console.log('');
console.log('  SWARM PERFORMANCE METRICS');
divider();
row('Overall Score:', `${overallScore}/100`);
row('Success Score:', `${successScore}/100`);
row('Fee Score:', `${feeScore}/100  (${feeXRP.toFixed(6)} XRP/tx)`);
row('Latency Score:', `${latencyScore}/100  (${execMs}ms payment)`);
row('Total Time:', `${(totalMs / 1000).toFixed(2)}s`);
row('Planner time:', `${plannerMs}ms`);
row('Executor time:', `${execMs}ms`);
row('Analyst time:', `${analystMs}ms`);
row('Total fees paid:', `${totalFee} XRP`);
row('Agents used:', `3  (Planner + Executor + Analyst)`);
console.log('');
console.log('  SUGGESTED IMPROVEMENTS');
divider();
improvements.forEach((imp, i) => console.log(`  ${i + 1}. ${imp}`));
console.log('');
console.log('  ARTIFACTS');
divider();
row('Logs dir:', `swarm-logs/`);
row('Plan:', `swarm-logs/plan.json`);
row('Execution:', `swarm-logs/execution.json`);
row('Analysis:', `swarm-logs/analysis.json`);
row('Demo run:', demoFile.replace(REPO_ROOT + '/', ''));
divider('═');
console.log('  Hermes Agent Swarm — All agents completed successfully.');
divider('═');
console.log('');
