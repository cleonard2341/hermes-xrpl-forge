/**
 * demo-skill-evolution.mjs — the mind-blower.
 *
 * Mints an NFT on XRPL Testnet whose URI encodes the v1→v2 evolution of the
 * xrpl_send_payment skill. The on-chain NFT is the verifiable record that an
 * AI agent's capability evolved from v1 → v2.
 *
 *   payload   = compact JSON summary  (full record in evolution-metadata.json)
 *   URI       = data:application/json;base64,<payload>
 *   tx type   = NFTokenMint, Flags:8 (Transferable), Taxon:1
 */

import { Client, Wallet, convertStringToHex } from 'xrpl';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WALLET_FILE = resolve(__dirname, '..', 'wallet', 'xrpl-wallet.txt');
const META_FILE   = resolve(__dirname, '..', 'skill-evolutions', 'evolution-metadata.json');

const TESTNET = 'wss://s.altnet.rippletest.net:51233';

function divider(c = '─', n = 62) { console.log(c.repeat(n)); }
function row(k, v) { console.log(`  ${k.padEnd(22)} ${v}`); }
function log(level, msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const icon = { INFO: '  ✦', OK: '  ✔', WARN: '  ⚠', ERR: '  ✘' }[level] ?? '  ·';
  console.log(`${icon} [${ts}] ${msg}`);
}

const walletFile = readFileSync(WALLET_FILE, 'utf8');
const seedMatch = walletFile.match(/Seed:\s+(\S+)/);
if (!seedMatch) {
  console.error(`Could not find a Seed line in ${WALLET_FILE}`);
  process.exit(1);
}
const wallet = Wallet.fromSeed(seedMatch[1]);

const meta = JSON.parse(readFileSync(META_FILE, 'utf8'));

const compactMeta = JSON.stringify({
  skill: 'xrpl_send_payment',
  v:     'v1->v2',
  agent: 'Hermes',
  improvements: 'retry,logging,memo,preflight',
});
const dataURI = `data:application/json;base64,${Buffer.from(compactMeta).toString('base64')}`;
const uriHex  = convertStringToHex(dataURI).toUpperCase();
if (uriHex.length > 512) throw new Error(`URI too long: ${uriHex.length} hex chars (max 512)`);

const client = new Client(TESTNET);

console.log('');
divider('═');
console.log('  XRPL SKILL EVOLUTION DEMO  —  Hermes Agent');
divider('═');

await client.connect();
log('OK', 'Connected to XRPL Testnet');

console.log('');
console.log('  [1/3]  Evolution Summary');
divider();
row('Skill:', meta.skill_name);
row('Agent:', meta.author);
row('Network:', meta.network);
row('From → To:', `${Object.keys(meta.versions).slice(0, 1)} → ${Object.keys(meta.versions).slice(-1)}`);
row('Improvements:', 'retry, logging, memo, preflight');
divider();

console.log('');
console.log('  [2/3]  Minting NFT');
divider();

const tx = await client.autofill({
  TransactionType: 'NFTokenMint',
  Account: wallet.address,
  URI: uriHex,
  Flags: 8,
  NFTokenTaxon: 1,
  TransferFee: 0,
  Memos: [{
    Memo: {
      MemoData: convertStringToHex('xrpl_send_payment v1→v2 Hermes Skill Evolution'),
      MemoType: convertStringToHex('text/plain'),
    }
  }],
});

const fee = Number(tx.Fee) / 1_000_000;
log('INFO', `Fee: ${fee.toFixed(6)} XRP`);
log('INFO', 'Signing and submitting NFTokenMint...');

const signed = wallet.sign(tx);
const result = await client.submitAndWait(signed.tx_blob);

const outcome = result.result.meta.TransactionResult;
const hash    = result.result.hash;
const ledger  = result.result.ledger_index;

let nftID = null;
try {
  for (const node of result.result.meta.AffectedNodes) {
    const created = node.CreatedNode || node.ModifiedNode;
    if (!created || created.LedgerEntryType !== 'NFTokenPage') continue;
    const nfts = (created.NewFields || created.FinalFields)?.NFTokens;
    if (nfts?.length) {
      nftID = nfts[nfts.length - 1].NFToken.NFTokenID;
      break;
    }
  }
} catch (_) {}

console.log('');
console.log('  [3/3]  Mint Result');
divider();
row('Status:', outcome === 'tesSUCCESS' ? '✔  CONFIRMED' : `✘  ${outcome}`);
row('Tx Hash:', hash);
row('Ledger:', String(ledger));
row('Fee paid:', `${fee.toFixed(6)} XRP`);
if (nftID) row('NFT ID:', nftID);
row('Tx Explorer:', `https://testnet.xrpl.org/transactions/${hash}`);
if (nftID) row('NFT Explorer:', `https://testnet.xrpl.org/nft/${nftID}`);
divider('═');
log('OK', 'Skill evolution minted on XRPL Testnet — verifiable on-chain.');
console.log('');

await client.disconnect();
