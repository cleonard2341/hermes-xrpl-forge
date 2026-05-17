/**
 * demo-full-run.mjs — runs the payment demo, then the skill-evolution NFT mint.
 *
 * Each step is a separate child process so its output renders cleanly, and so a
 * crash in one step doesn't poison module state for the next. Stops on the
 * first failure.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const steps = [
  { label: 'Payment demo',          script: resolve(__dirname, 'demo-payment.mjs') },
  { label: 'Skill evolution demo',  script: resolve(__dirname, 'demo-skill-evolution.mjs') },
];

function banner(text) {
  const bar = '═'.repeat(64);
  console.log(`\n${bar}\n  ${text}\n${bar}`);
}

function runStep({ label, script }) {
  return new Promise((res, rej) => {
    banner(`▶  ${label}`);
    const child = spawn(process.execPath, [script], { stdio: 'inherit' });
    child.on('exit', code => {
      if (code === 0) res();
      else rej(new Error(`${label} exited with code ${code}`));
    });
    child.on('error', rej);
  });
}

banner('XRPL HERMES — FULL DEMO RUN');

for (const step of steps) {
  try {
    await runStep(step);
  } catch (err) {
    console.error(`\n✘  ${err.message}\nStopping full run.`);
    process.exit(1);
  }
}

banner('✔  Full demo run complete.');
