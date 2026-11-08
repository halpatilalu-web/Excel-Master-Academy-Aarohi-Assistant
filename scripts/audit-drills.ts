/**
 * Dev calibration: print every drill's formula + the engine's answer, so each
 * value can be eyeballed against documented Excel behaviour.
 * Run: `npx tsx scripts/audit-drills.ts [category]`.
 */
import { FORMULA_DRILLS } from "../src/data/formulaPractice";

const cat = process.argv[2];
const rows = FORMULA_DRILLS.filter((drill) => !cat || drill.cat === cat);
rows.forEach((drill) => {
  console.log(`${drill.name.padEnd(16)} ${drill.dataset.padEnd(12)} ${drill.expected.padEnd(22)} ${drill.formula}`);
});
console.log(`\n${rows.length} drills`);
