// These are challenge parameter sets, ordered by the design paper's first ePrint.
// Only the score ledger below determines official standings.
const forsEntry = "/tree/main/examples/entries/construction/";
export const constructions = [
  { name: "FORS", bytes: 2432, certified: true, paper: "2019/1086", source: forsEntry + "fors-2432" },
  { name: "FORS+C", bytes: 2132, certified: true, paper: "2022/778", source: forsEntry + "fors-c-2132" },
  { name: "FORS+C", bytes: 2020, certified: true, paper: "2022/778", source: forsEntry + "fors-c-2020" },
  { name: "PORS+FP", bytes: 1780, certified: true, paper: "2025/2069", source: "/pull/6" },
  { name: "BPORS+FP", bytes: 1492, certified: true, paper: "2026/1328", source: "/pull/7" },
  { name: "BPORS-C+BFP", bytes: 1188, certified: true, paper: "2026/2374", source: "/pull/5" },
  { name: "GRS-CC", bytes: 756, certified: true, paper: "2026/2502", source: "/pull/8" },
];

// One sample per accepted snapshot, in the judge's intake order. Only records move a bound.
export function boundSeries(ledger) {
  const state = {
    lower: ledger.opening["lower-bound"],
    upper: ledger.opening.construction,
  };
  const samples = [{ ...state, label: "Opening" }];
  for (const entry of ledger.history) {
    if (entry.record) {
      if (entry.track === "lower-bound") state.lower = entry.bound_bytes;
      if (entry.track === "construction") state.upper = entry.bound_bytes;
    }
    samples.push({ ...state, label: "PR #" + entry.pr });
  }
  return samples;
}

export function axis(values) {
  let low = Infinity,
    high = -Infinity;
  for (const v of values)
    if (Number.isFinite(v)) {
      low = Math.min(low, v);
      high = Math.max(high, v);
    }
  if (!Number.isFinite(low)) return { min: 0, max: 4, step: 1 };
  const rough = Math.max(1, (high - low) / 3.5);
  const unit = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].find((k) => k * unit >= rough) * unit;
  let min = Math.max(0, Math.floor(low / step) * step);
  let max = Math.ceil(high / step) * step;
  if (min === low && min >= step) min -= step;
  if (max === high) max += step;
  return { min, max, step };
}

export const referencePapers = {
  "fors-18-8-v1": "2019/1086",
  "fors-c-18-7-18-v1": "2022/778",
  "fors-c-17-7-19-v1": "2022/778",
  "pors-fp-1780-v1": "2025/2069",
  "bpors-fp-1492-v1": "2026/1328",
  "bpors-c-bfp-1188-v1": "2026/2374",
  "grs-cc-v1": "2026/2502",
};

export function publicationURL(entry) {
  if (entry.paper_url) {
    try {
      const url = new URL(entry.paper_url);
      if (url.protocol === "https:" && !url.username && !url.password) return url.href;
    } catch { /* Fall back to the registered design paper. */ }
  }
  const paper = referencePapers[entry.reference];
  return paper ? "https://eprint.iacr.org/" + paper : null;
}
