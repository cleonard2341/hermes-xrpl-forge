/**
 * send-payment-v2.mjs — historical artifact: xrpl_send_payment EVOLUTION v2
 *
 * Kept here as a snapshot of the v2 implementation that was minted as the
 * skill-evolution NFT (see evolution-metadata.json). For day-to-day use,
 * call the canonical version at skills/xrpl_send_payment.mjs.
 *
 * Improvements over v1:
 *   - Retry logic (up to 3 attempts with backoff)
 *   - Structured logging with timestamps
 *   - Mandatory memo support (passed as 3rd arg or defaults to "Hermes Payment")
 *   - Pre-flight destination account check
 *   - Fee estimation logged before submission
 *   - Post-send balance confirmed on ledger
 */

import { Client, Wallet, xrpToDrops, convertStringToHex } from 'xrpl';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WALLET_FILE = resolve(__dirname, '..', 'wallet', 'xrpl-wallet.txt');

const TESTNET     = 'wss://s.altnet.rippletest.net:51233';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

const destination = process.argv[2];
const amount      = process.argv[3];
const memo        = process.argv[4] || 'Hermes Payment';

if (!destination || !amount) {
  console.error('Usage: node skill-evolutions/send-payment-v2.mjs <destination> <amount_xrp> [memo]');
  process.exit(1);
}

function log(level, msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const prefix = { INFO: '  ✦', WARN: '  ⚠', ERR: '  ✘', OK: '  ✔' }[level] ?? '  ·';
  console.log(`${prefix} [${ts}] ${msg}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function withRetry(fn, label) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      log('WARN', `${label} failed (attempt ${attempt}/${MAX_RETRIES}): ${err.message} — retrying in ${RETRY_DELAY / 1000}s`);
      await sleep(RETRY_DELAY * attempt);
    }
  }
}

const walletFile = readFileSync(WALLET_FILE, 'utf8');
const wallet = Wallet.fromSeed(walletFile.match(/Seed:\s+(\S+)/)[1]);

const client = new Client(TESTNET);

function divider(c = '─', n = 58) { console.log(c.repeat(n)); }
function row(k, v) { console.log(`  ${k.padEnd(20)} ${v}`); }

console.log('');
divider('═');
console.log('  XRPL PAYMENT v2  —  Hermes Skill Evolution');
divider('═');

await withRetry(() => client.connect(), 'WebSocket connect');
log('OK', `Connected to ${TESTNET}`);

try {
  await client.request({ command: 'account_info', account: destination, ledger_index: 'validated' });
  log('OK', 'Destination account verified on ledger');
} catch (e) {
  if (e.data?.error === 'actNotFound') {
    log('WARN', 'Destination not yet funded — first payment will activate it (reserve 10 XRP)');
  } else throw e;
}

const infoBefore = await client.request({ command: 'account_info', account: wallet.address, ledger_index: 'validated' });
const balanceBefore = Number(infoBefore.result.account_data.Balance) / 1_000_000;

console.log('');
console.log('  Payment Details');
divider();
row('From:', wallet.address);
row('To:', destination);
row('Amount:', `${amount} XRP`);
row('Memo:', memo);
row('Balance before:', `${balanceBefore.toFixed(6)} XRP`);
divider();

const tx = await client.autofill({
  TransactionType: 'Payment',
  Account: wallet.address,
  Amount: xrpToDrops(amount),
  Destination: destination,
  Memos: [{
    Memo: {
      MemoData: convertStringToHex(memo),
      MemoType: convertStringToHex('text/plain'),
    }
  }],
});

const feeXRP = Number(tx.Fee) / 1_000_000;
log('INFO', `Estimated fee: ${feeXRP.toFixed(6)} XRP`);

const signed = wallet.sign(tx);
const result = await withRetry(() => client.submitAndWait(signed.tx_blob), 'submitAndWait');

const outcome = result.result.meta.TransactionResult;
const hash    = result.result.hash;
const ledger  = result.result.ledger_index;

const infoAfter = await client.request({ command: 'account_info', account: wallet.address, ledger_index: 'validated' });
const balanceAfter = Number(infoAfter.result.account_data.Balance) / 1_000_000;

console.log('');
console.log('  Result');
divider();
row('Status:', outcome === 'tesSUCCESS' ? '✔  CONFIRMED' : `✘  ${outcome}`);
row('Hash:', hash);
row('Ledger:', ledger);
row('Fee paid:', `${feeXRP.toFixed(6)} XRP`);
row('Balance after:', `${balanceAfter.toFixed(6)} XRP`);
row('Explorer:', `https://testnet.xrpl.org/transactions/${hash}`);
divider('═');
log('OK', 'Payment complete.');
console.log('');

await client.disconnect();
