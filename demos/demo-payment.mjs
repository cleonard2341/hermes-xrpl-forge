/**
 * demo-payment.mjs — clean walkthrough of a single XRPL testnet payment.
 *
 * Shows: balance → submit with memo → confirmation → balance delta.
 *
 * Override the destination by setting DEMO_DESTINATION in the environment.
 */

import { Client, Wallet, xrpToDrops, convertStringToHex } from 'xrpl';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WALLET_FILE = resolve(__dirname, '..', 'wallet', 'xrpl-wallet.txt');

const DESTINATION = process.env.DEMO_DESTINATION || 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
const AMOUNT_XRP  = process.env.DEMO_AMOUNT || '1';
const MEMO_TEXT   = process.env.DEMO_MEMO || 'Hermes XRPL Demo Payment';
const TESTNET     = 'wss://s.altnet.rippletest.net:51233';
const EXPLORER    = 'https://testnet.xrpl.org/transactions';

function divider(char = '─', len = 56) { console.log(char.repeat(len)); }
function row(label, value) { console.log(`  ${label.padEnd(18)} ${value}`); }

const walletFile = readFileSync(WALLET_FILE, 'utf8');
const seedMatch = walletFile.match(/Seed:\s+(\S+)/);
if (!seedMatch) {
  console.error(`Could not find a Seed line in ${WALLET_FILE}`);
  process.exit(1);
}
const wallet = Wallet.fromSeed(seedMatch[1]);

const client = new Client(TESTNET);
await client.connect();

console.log('');
divider('═');
console.log('  XRPL TESTNET DEMO  —  Hermes Payment');
divider('═');

const info = await client.request({
  command: 'account_info',
  account: wallet.address,
  ledger_index: 'validated',
});
const balanceBefore = Number(info.result.account_data.Balance) / 1_000_000;

console.log('');
console.log('  [1/3]  Wallet Status');
divider();
row('Address:', wallet.address);
row('Balance:', `${balanceBefore.toFixed(6)} XRP`);
row('Ledger:', info.result.ledger_index);
divider();

console.log('');
console.log('  [2/3]  Sending Payment');
divider();
row('To:', DESTINATION);
row('Amount:', `${AMOUNT_XRP} XRP`);
row('Memo:', MEMO_TEXT);
console.log('  Submitting to ledger...');

const tx = await client.autofill({
  TransactionType: 'Payment',
  Account: wallet.address,
  Amount: xrpToDrops(AMOUNT_XRP),
  Destination: DESTINATION,
  Memos: [{
    Memo: {
      MemoData: convertStringToHex(MEMO_TEXT),
      MemoType: convertStringToHex('text/plain'),
    }
  }],
});

const signed = wallet.sign(tx);
const result = await client.submitAndWait(signed.tx_blob);

const outcome  = result.result.meta.TransactionResult;
const hash     = result.result.hash;
const fee      = Number(tx.Fee) / 1_000_000;
const ledgerTx = result.result.ledger_index;

row('Status:', outcome === 'tesSUCCESS' ? '✔  tesSUCCESS — Confirmed' : `✘  ${outcome}`);
row('Fee paid:', `${fee.toFixed(6)} XRP`);
row('Ledger:', ledgerTx);
divider();

console.log('');
console.log('  [3/3]  Transaction Receipt');
divider();
row('Hash:', hash);
row('Explorer:', `${EXPLORER}/${hash}`);
divider();

const info2 = await client.request({
  command: 'account_info',
  account: wallet.address,
  ledger_index: 'validated',
});
const balanceAfter = Number(info2.result.account_data.Balance) / 1_000_000;

console.log('');
console.log('  Balance Summary');
divider();
row('Before:', `${balanceBefore.toFixed(6)} XRP`);
row('Sent:', `-${AMOUNT_XRP}.000000 XRP`);
row('Fee:', `-${fee.toFixed(6)} XRP`);
row('After:', `${balanceAfter.toFixed(6)} XRP`);
divider('═');
console.log('  Demo complete.');
divider('═');
console.log('');

await client.disconnect();
