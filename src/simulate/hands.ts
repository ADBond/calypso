import fs from 'fs';
import path from 'path';

import { simulateHand } from "./simulate";

async function main() {
  console.log("Simulating games");
  const start = performance.now();

  const n = 10000;
  const totals: number[] = [];
  let minTot = 50;
  let maxTot = 10;

  for (let i = 0; i < n; i++) {
    console.log(i);
    const [scores, log] = await simulateHand('ismcts1000');
    const tot = scores[0] + scores[1];
    totals.push(tot);
    const outDir = path.resolve(process.cwd(), 'output');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
        path.join(outDir, 'simulation-results.json'),
        JSON.stringify(totals, null, 2)
    );
    if (tot < minTot) {
        minTot = tot;
        fs.writeFileSync(
            path.join(outDir, `min_logs_${tot}_sim${i}.json`),
            JSON.stringify(log, null, 2)
        );
    }
    if (tot > maxTot) {
        maxTot = tot;
        fs.writeFileSync(
            path.join(outDir, `max_logs_${tot}_sim${i}.json`),
            JSON.stringify(log, null, 2)
        );
    }
  }
  console.log(totals);

  const elapsedMs = performance.now() - start;
  console.log(`simulating ${n} took ${elapsedMs.toFixed(2)}ms (${(10*elapsedMs/(1000*n)).toFixed(2)}s / 10 hands)`);

  console.log("Complete");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
