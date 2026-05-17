/**
 * xrpl_mint_skill_evolution.mjs — mint a skill-evolution NFT on XRPL Testnet
 *
 * Reads evolution metadata from a JSON file, encodes a compact summary as a
 * base64 data URI, and mints an NFTokenMint transaction whose URI field
 * encodes that data URI.
 *
 * Usage:
 *   node skills/xrpl_mint_skill_evolution.mjs [metadata.json]
 *
 * Defaults to ../skill-evolutions/evolution-metadata.json
 */

import { Client, Wallet, convertStringToHex } from 'xrpl';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WALLET_FILE  = resolve(__dirname, '..', 'wallet', 'xrpl-wallet.txt');
const DEFAULT_META = resolve(__dirname, '..', 'skill-evolutions', 'evolution-metadata.json');

const TESTNET = 'wss://s.altnet.rippletest.net:51233';
const metaPath = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : DEFAULT_META;

function divider(c = '─', n = 60) { console.log(c.repeat(n)); }
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

const meta = JSON.parse(readFileSync(metaPath, 'utf8'));

// XRPL URI field max = 256 bytes (512 hex chars) — encode a compact summary
const compactMeta = JSON.stringify({
  skill:        meta.skill_name ?? 'unknown_skill',
  v:            `${Object.keys(meta.versions ?? {}).join('->')}`,
  agent:        meta.author ?? 'unknown',
  improvements: Object.keys(meta.versions?.[Object.keys(meta.versions ?? {}).pop() ?? '']?.improvements ?? {}).join(',') || 'n/a',
});
const dataURI = `data:application/json;base64,${Buffer.from(compactMeta).toString('base64')}`;
const uriHex  = convertStringToHex(dataURI).toUpperCase();
if (uriHex.length > 512) throw new Error(`URI too long: ${uriHex.length} hex chars (max 512)`);

const client = new Client(TESTNET);

console.log('');
divider('═');
console.log('  XRPL SKILL EVOLUTION NFT MINT  —  Hermes Skill');
divider('═');

await client.connect();
log('OK', 'Connected to XRPL Testnet');

const tx = await client.autofill({
  TransactionType: 'NFTokenMint',
  Account: wallet.address,
  URI: uriHex,
  Flags: 8,          // tfTransferable
  NFTokenTaxon: 1,
  TransferFee: 0,
  Memos: [{
    Memo: {
      MemoData: convertStringToHex(`${meta.skill_name ?? 'skill'} — Hermes Skill Evolution`),
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
console.log('  Mint Result');
divider();
row('Status:', outcome === 'tesSUCCESS' ? '✔  CONFIRMED' : `✘  ${outcome}`);
row('Tx Hash:', hash);
row('Ledger:', String(ledger));
row('Fee paid:', `${fee.toFixed(6)} XRP`);
if (nftID) row('NFT ID:', nftID);
row('Tx Explorer:', `https://testnet.xrpl.org/transactions/${hash}`);
if (nftID) row('NFT Explorer:', `https://testnet.xrpl.org/nft/${nftID}`);
divider('═');
log('OK', 'Skill evolution minted as NFT on XRPL Testnet.');
console.log('');

await client.disconnect();
