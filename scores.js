import { constructions, openingConstruction, boundSeries, axis, publicationURL } from "./records.mjs";

const repo = "https://github.com/few-time-signature/challenge";
const svg = document.querySelector("#plot");
const mint = "#7de0bf";
const amber = "#efbd83";
const violet = "#a3aaff";
const segments = [...document.querySelectorAll("[data-track]")];
const number = new Intl.NumberFormat("en");
const fmt = (v) => (v === null ? "Open" : number.format(v) + " B");
const trackName = {
  "lower-bound": "Lower bound",
  construction: "Construction",
};
const ns = "http://www.w3.org/2000/svg";
let track = "lower-bound";
let ledger, samples, selected, geometry;

function node(tag, attrs, text) {
  const el = document.createElementNS(ns, tag);
  for (const [key, val] of Object.entries(attrs)) el.setAttribute(key, val);
  if (text !== undefined) el.textContent = text;
  return el;
}
function link(label, url) {
  const a = document.createElement("a");
  a.textContent = label;
  a.href = repo + url;
  return a;
}
function avatar(name) {
  const icon = document.createElement("canvas");
  icon.className = "avatar";
  icon.width = icon.height = 9;
  icon.setAttribute("aria-hidden", "true");
  const c = icon.getContext("2d");
  let hash = 2166136261;
  for (const letter of name)
    hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619) >>> 0;
  const hue = hash % 360;
  c.fillStyle = "hsl(" + hue + " 32% 22%)";
  c.fillRect(0, 0, 9, 9);
  c.fillStyle = "hsl(" + hue + " 64% 79%)";
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 3; x++)
      if (hash & (1 << (3 * y + x))) {
        c.fillRect(2 + x, 2 + y, 1, 1);
        c.fillRect(6 - x, 2 + y, 1, 1);
      }
  return icon;
}
function team(name) {
  const el = document.createElement("span");
  el.className = "team";
  el.append(avatar(name), name);
  return el;
}
function cell(row, content, cls = "") {
  const td = row.insertCell();
  td.className = cls;
  td.append(content);
}
function empty(body, count, text) {
  const td = body.insertRow().insertCell();
  td.colSpan = count;
  td.className = "empty";
  td.textContent = text;
}
function drawBoard() {
  segments.forEach((btn) =>
    btn.setAttribute("aria-pressed", String(btn.dataset.track === track)),
  );
  const rows = ledger.rankings[track];
  document.querySelector("#team-count").textContent =
    rows.length + " " + (rows.length === 1 ? "team" : "teams");
  document.querySelector("#track-hint").textContent =
    track === "lower-bound"
      ? "Higher byte bounds rank first."
      : "Smaller signatures rank first.";
  const body = document.querySelector("#ranks");
  body.replaceChildren();
  if (!rows.length)
    empty(
      body,
      4,
      track === "construction"
        ? "Awaiting the first qualifying construction record."
        : "Awaiting the first qualifying lower-bound record.",
    );
  for (const [i, r] of rows.entries()) {
    const tr = body.insertRow();
    if (i === 0) tr.className = "leader";
    cell(tr, String(i + 1).padStart(2, "0"), "rank");
    cell(tr, team(r.team));
    cell(tr, link(fmt(r.bound_bytes), "/pull/" + r.pr), "num bytes");
    cell(
      tr,
      r.delta === null ? "First" : "+" + number.format(r.delta) + " B",
      "num gain",
    );
  }
}
let writeups = [];
let designs = [...constructions];
function drawHistory() {
  const container = document.querySelector("#history");
  container.replaceChildren();
  if (!writeups.length) {
    container.textContent = "No verified write-ups yet.";
    return;
  }
  for (const r of [...writeups].sort((a, b) => b.run - a.run)) {
    const article = document.createElement("article");
    article.className = "writeup";
    const title = document.createElement("h3");
    title.textContent = r.title || r.id;
    const bytes = document.createElement("strong");
    bytes.textContent = fmt(r.bound_bytes);
    if (!title.textContent.replaceAll(",", "").includes(String(r.bound_bytes))) title.append(bytes);
    const meta = document.createElement("small");
    meta.textContent = trackName[r.track] + " · " + r.team + " · PR #" + r.pr;
    const p = document.createElement("p");
    p.textContent = r.summary;
    const links = document.createElement("div");
    links.className = "writeup-links";
    const path = "/blob/" + r.head + "/submissions/" + r.track + "/" + r.id + "/ARGUMENT.md";
    links.append(link("Full write-up", path), link("Lean judge receipt", "/actions/runs/" + r.run));
    const paper = publicationURL(r);
    if (paper) links.append(externalLink("Design paper", paper));
    article.append(meta, title, p, links);
    container.append(article);
  }
}

function externalLink(label, url) {
  const a = document.createElement("a");
  a.textContent = label;
  a.href = url;
  return a;
}
const paperURL = point => point.paper ? "https://eprint.iacr.org/" + point.paper : point.paper_url;
const status = (point) => point.certified ? "Lean-certified" : "Candidate";

function drawSources() {
  const body = document.querySelector("#construction-sources");
  body.replaceChildren();
  for (const point of designs) {
    const row = body.insertRow();
    const paper = document.createElement("a");
    if (paperURL(point)) paper.href = paperURL(point);
    paper.textContent = point.name;
    cell(row, paper);
    cell(row, fmt(point.bytes), "num bytes");
    cell(row, link(status(point), point.source));
  }
}

function inspect(index) {
  selected = index;
  const guide = svg.querySelector(".cursor");
  guide.setAttribute("x1", geometry[index]);
  guide.setAttribute("x2", geometry[index]);
  const readout = document.querySelector("#readout");
  if (index < designs.length) {
    const point = designs[index];
    readout.replaceChildren(point.name + " · " + fmt(point.bytes) + " · ",
      ...(paperURL(point) ? [externalLink(point.paper ? "Design paper · ePrint " + point.paper : "Design paper", paperURL(point)), " · "] : []), link(status(point), point.source));
  } else {
    const sample = samples[index - designs.length];
    readout.textContent = sample.label + " · Certified lower " + fmt(sample.lower)
      + " · Certified upper " + fmt(sample.upper);
  }
}

function plotLabel(x, y, content, anchor = "start", color = "#acb6cf") {
  return node("text", { x, y, fill: color, "text-anchor": anchor,
    "font-family": "ui-monospace, monospace", "font-size": 11,
    "pointer-events": "none" }, content);
}

const panel = document.querySelector("#point-popup");
const wrap = document.querySelector(".plot-wrap");
let trigger = null;
let dismissTimer;
function closePoint(restoreFocus = false) {
  clearTimeout(dismissTimer);
  if (!trigger) return;
  const old = trigger;
  trigger = null;
  old.setAttribute("aria-expanded", "false");
  panel.hidden = true;
  if (restoreFocus) old.focus();
}
function showPoint(button, index, title, paper, proof) {
  clearTimeout(dismissTimer);
  if (trigger === button && !panel.hidden) return;
  if (trigger && trigger !== button) trigger.setAttribute("aria-expanded", "false");
  trigger = button;
  inspect(index);
  button.setAttribute("aria-expanded", "true");
  document.querySelector("#point-title").textContent = title;
  const links = document.querySelector("#point-links");
  links.replaceChildren();
  if (paper) links.append(externalLink(paper.startsWith("https://eprint.iacr.org/") ?
    "Design paper · ePrint " + paper.slice("https://eprint.iacr.org/".length) : "Design paper", paper));
  links.append(externalLink("View proof", proof));
  panel.hidden = false;
  const box = wrap.getBoundingClientRect(), mark = button.getBoundingClientRect();
  const left = mark.left + mark.width / 2 - box.left - panel.offsetWidth / 2;
  panel.style.left = Math.max(0, Math.min(left, box.width - panel.offsetWidth)) + "px";
  const top = mark.top - box.top - panel.offsetHeight;
  panel.style.top = (top >= 0 ? top : mark.bottom - box.top) + "px";
}
function deferClose() {
  clearTimeout(dismissTimer);
  dismissTimer = setTimeout(() => {
    if (!panel.matches(":hover, :focus-within") && !trigger?.matches(":hover, :focus")) closePoint();
  }, 220);
}
panel.addEventListener("pointerenter", () => clearTimeout(dismissTimer));
panel.addEventListener("pointerleave", deferClose);
panel.addEventListener("focusout", deferClose);
document.querySelector("#point-close").addEventListener("click", () => closePoint(true));
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !panel.hidden) { e.preventDefault(); closePoint(true); }
});
document.addEventListener("pointerdown", e => {
  if (!panel.contains(e.target) && !trigger?.contains(e.target)) closePoint();
});
function marker(index, y, color, filled, paper, proof, title) {
  const x = geometry[index];
  const button = node("g", { role: "button", tabindex: 0, "aria-label": title,
    "aria-haspopup": "dialog", "aria-controls": "point-popup", "aria-expanded": "false" });
  button.append(node("circle", { cx: x, cy: y, r: 12, fill: "transparent" }),
    node("circle", { class: "mark", cx: x, cy: y, r: 4.5,
      fill: filled ? color : "#13182a", stroke: color, "stroke-width": 2 }));
  const show = () => showPoint(button, index, title, paper, proof);
  button.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") show(); });
  button.addEventListener("pointerleave", deferClose);
  button.addEventListener("focus", () => inspect(index));
  button.addEventListener("blur", deferClose);
  button.addEventListener("click", show);
  button.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); show(); panel.querySelector("a").focus();
    }
  });
  return button;
}

function drawPlot() {
  const width = Math.round(svg.getBoundingClientRect().width);
  if (!samples?.length || width < 100) return;
  closePoint();
  const left = 38, right = width - 13, top = 18, bottom = 173;
  const count = designs.length;
  const opening = left + (right - left) * (samples.length === 1 ? .82 : .66);
  const step = (opening - left) / count;
  geometry = designs.map((_, i) => left + step * i);
  for (let i = 0; i < samples.length; i++)
    geometry.push(opening + i * (right - opening) / Math.max(1, samples.length - 1));

  const scale = axis([...designs.map((p) => p.bytes),
    ...samples.flatMap((s) => [s.lower, s.upper])]);
  const y = (v) => bottom - (v - scale.min) * (bottom - top) / (scale.max - scale.min);
  svg.setAttribute("viewBox", "0 0 " + width + " 205");
  svg.replaceChildren(node("title", { id: "plot-title" }, "Historical designs and official signature bounds"),
    node("desc", { id: "plot-desc" }, "Construction sizes for the published parameter sets and verified submissions. Activate a point to open its paper and proof links. Official records at the right open their proofs or submissions."));
  for (let v = scale.min; v <= scale.max; v += scale.step) {
    svg.append(node("line", { x1: left, x2: right, y1: y(v), y2: y(v),
      stroke: "#31394e", "stroke-dasharray": "3 5" }),
      plotLabel(left - 5, y(v) + 4, number.format(v), "end"));
  }
  const divider = opening - step / 2;
  svg.append(node("line", { x1: divider, x2: divider, y1: top, y2: bottom,
    stroke: "#53607a", "stroke-dasharray": "4 4" }),
    plotLabel(left, 198, "Construction results"),
    plotLabel(right, 198, width < 370 ? "Official" : "Official bounds", "end"),
    node("line", { class: "cursor", y1: top, y2: bottom, stroke: "#aeb8de",
      "stroke-opacity": .4, "stroke-dasharray": "2 3", "pointer-events": "none" }));

  const dots = [];
  let certifiedPath = "";
  for (const [i, p] of designs.entries()) {
    const color = p.certified ? mint : amber;
    if (p.certified)
      certifiedPath += (certifiedPath ? " L " : "M ") + geometry[i] + " " + y(p.bytes);
    dots.push(marker(i, y(p.bytes), color, p.certified, paperURL(p), repo + p.source,
      p.name + " · " + fmt(p.bytes) + " · " + status(p)));
    if (i === 0 || i === count - 1)
      svg.append(plotLabel(geometry[i], y(p.bytes) - 12, p.name + " " + fmt(p.bytes),
        i === 0 ? "start" : "end", color));
  }
  if (certifiedPath)
    svg.append(node("path", { d: certifiedPath, stroke: mint, "stroke-width": 1.5, fill: "none" }));

  for (const [key, color] of [["lower", violet], ["upper", mint]]) {
    let path = "", previous = null;
    for (const [i, sample] of samples.entries()) {
      const value = sample[key];
      if (value === null || value === previous) continue;
      const index = count + i;
      path += path ? " H " + geometry[index] + " V " + y(value)
        : "M " + geometry[index] + " " + y(value);
      const source = i ? "/pull/" + ledger.history[i - 1].pr
        : key === "lower" ? "/blob/main/formal/PoissonDAG/V2/Lower99.lean"
        : openingConstruction.source;
      const paper = key === "lower" ? null : i ? publicationURL(ledger.history[i - 1]) : paperURL(openingConstruction);
      dots.push(marker(index, y(value), color, true, paper, repo + source,
        (i === 0 && key === "upper" ? "Opening · " + openingConstruction.name : sample.label)
        + " · certified " + key + " bound · " + fmt(value)));
      previous = value;
    }
    if (path)
      svg.append(node("path", { d: path + " H " + right, stroke: color,
        "stroke-width": 2.5, fill: "none", "stroke-linejoin": "round" }));
  }
  svg.append(...dots);
  inspect(selected);
}

svg.addEventListener("pointermove", (event) => {
  if (!geometry || trigger || event.pointerType !== "mouse") return;
  const x = event.clientX - svg.getBoundingClientRect().left;
  let closest = 0;
  for (let i = 1; i < geometry.length; i++)
    if (Math.abs(geometry[i] - x) < Math.abs(geometry[closest] - x)) closest = i;
  if (closest !== selected) inspect(closest);
});
svg.addEventListener("keydown", (e) => {
  if (!geometry || e.target !== svg) return;
  const last = geometry.length - 1;
  const keys = { ArrowLeft: Math.max(0, selected - 1),
    ArrowRight: Math.min(last, selected + 1), Home: 0, End: last };
  if (e.key in keys) {
    e.preventDefault();
    inspect(keys[e.key]);
  }
});
segments.forEach((btn) =>
  btn.addEventListener("click", () => {
    track = btn.dataset.track;
    if (ledger) drawBoard();
  }),
);
new ResizeObserver(drawPlot).observe(svg.parentElement);

function display(data, source) {
  ledger = data;
  samples = boundSeries(data);
  selected = data.history.length ? designs.length + samples.length - 1 : designs.length - 1;

  updateUpper();
  document.querySelector("#opening-upper").textContent = fmt(data.opening.construction);
  document.querySelector("#sync").textContent = source;
  drawBoard();
  drawPlot();
}
function updateUpper() {
  const lower = [ledger?.best["lower-bound"], ...writeups.filter(r => r.track === "lower-bound").map(r => r.bound_bytes)].filter(Number.isFinite);
  if (lower.length) document.querySelector("#lower").textContent = fmt(Math.max(...lower));
  const values = constructions.filter(r => r.certified).map(r => r.bytes);
  for (const r of writeups) if (r.track === "construction") values.push(r.bound_bytes);
  if (ledger?.best.construction != null) values.push(ledger.best.construction);
  document.querySelector("#upper").textContent = fmt(Math.min(...values));
}
async function loadFile(local, live, show, failed) {
  let current = false;
  async function get(url, remote) {
    const r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) throw Error("HTTP " + r.status);
    const data = await r.json();
    if (remote || !current) show(data, remote);
    if (remote) current = true;
  }
  const results = await Promise.allSettled([get(local, false), get(live, true)]);
  if (results.every(r => r.status === "rejected")) failed();
}
const raw = "https://raw.githubusercontent.com/few-time-signature/challenge/";
drawSources();
loadFile("scores.json", raw + "main/docs/scores.json",
  (data, live) => display(data, live ? "Scoring ledger from the challenge repository." : "Published scoring snapshot."),
  () => { document.querySelector("#sync").textContent = "Score ledger unavailable."; });
loadFile("writeups.json", raw + "verified-writeups/writeups.json", data => {
  writeups = data;
  designs = [...constructions];
  for (const r of writeups) {
    const paper = publicationURL(r);
    if (r.track !== "construction" || designs.some(d => d.pr === r.pr ||
      (r.reference && d.bytes === r.bound_bytes && paperURL(d) === paper))) continue;
    designs.push({ name: r.title || r.id, bytes: r.bound_bytes, certified: true, pr: r.pr,
      paper_url: paper, source: "/blob/" + r.head + "/submissions/construction/" + r.id + "/ARGUMENT.md" });
  }
  drawHistory(); drawSources(); updateUpper();
  if (ledger) { selected = designs.length - 1; drawPlot(); }
}, () => { document.querySelector("#history").textContent = "Write-ups are temporarily unavailable."; });
