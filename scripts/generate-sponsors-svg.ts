// Renders the sponsors SVG to a file, using the same code as GET /sponsors.
//
// Usage:
//   npm run sponsors:svg
//   npm run sponsors:svg -- --out dist/sponsors.svg

import { writeFile } from "node:fs/promises";
import { renderSponsorsSvg } from "../src/sponsors.ts";

const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const out = outIndex >= 0 ? args[outIndex + 1] : "sponsors.svg";

if (!out) {
    console.error("Missing path after --out");
    process.exit(1);
}

const svg = await renderSponsorsSvg();
await writeFile(out, svg, "utf8");
console.log(`Wrote ${out} (${svg.length} bytes)`);
